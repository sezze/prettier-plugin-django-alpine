export function replaceDjangoTags(text) {
  const djangoTags = {};
  let index = 0;
  let currentNesting = 0;
  let nesting = [0];
  const stateStack = [
    {
      mode: "default",
      data: {},
    },
  ];

  // Parse the html, and calculate the nesting level of each row + find each django tag
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    const prevChar = text[i - 1];
    const state = stateStack[stateStack.length - 1];

    if (char === "\n") {
      nesting.push(currentNesting);
    }

    const isDjangoTagOpening =
      char === "{" && (nextChar === "%" || nextChar === "{");
    const pushDjangoTagState = (replaceType) =>
      stateStack.push({
        mode: "djangoTag",
        data: { type: nextChar, replaceType },
        start: i,
      });

    const isStringOpening = char === '"' || char === "'";

    const pushStringState = () =>
      stateStack.push({
        mode: "string",
        data: { type: char },
        start: i,
      });

    switch (state.mode) {
      case "default":
        if (isDjangoTagOpening) {
          pushDjangoTagState("comment");
        }
        // Match HTML tags
        else if (char === "<") {
          const isClosing = nextChar === "/";
          stateStack.push({
            mode: "htmlTag",
            data: {
              isClosing,
            },
            start: i,
          });
          currentNesting = isClosing ? currentNesting - 1 : currentNesting + 1;
          nesting[nesting.length - 1] = currentNesting;
        }
        break;
      case "djangoTag":
        // First check if we are entering a string
        if (isStringOpening) {
          pushStringState();
        }
        // Then check if we are exiting the tag
        else if (
          (state.data.type === "%" && char === "%" && nextChar === "}") ||
          (state.data.type === "{" && char === "}" && nextChar === "}")
        ) {
          const start = state.start;
          const end = i + 2;
          const tag = text.slice(start, end);
          const key =
            state.data.replaceType === "comment"
              ? `<!--__DJANGO_TAG_${index++}__-->`
              : `__DJANGO_TAG_${index++}__`;
          djangoTags[key] = { tag, start, end, key };
          stateStack.pop();
          i++;
        }
        break;
      case "string":
        // If the previous stack's state is djangoTag, then don't match new django tags, otherwise do
        if (
          stateStack[stateStack.length - 2]?.mode !== "djangoTag" &&
          isDjangoTagOpening
        ) {
          pushDjangoTagState("attribute");
        } else if (char === state.data.type && prevChar !== "\\") {
          stateStack.pop();
        }
        break;
      case "htmlTag":
        // Match django tags and attribute names
        if (isDjangoTagOpening) {
          pushDjangoTagState("attribute");
        }
        // Match strings
        else if (isStringOpening) {
          pushStringState();
        }

        // Match closing of the tag
        else if (char === ">") {
          stateStack.pop();
        }
        break;
    }
  }

  // Build the string with placeholders and the html text between them
  let newString = [];
  let lastIndex = 0;
  for (const tag of Object.values(djangoTags)) {
    newString.push(text.slice(lastIndex, tag.start));
    newString.push(tag.key);
    lastIndex = tag.end;
  }

  // Add the last part of the string
  newString.push(text.slice(lastIndex));

  // console.log(newString);

  return { newString: newString.join(""), djangoTags, nesting };
}
