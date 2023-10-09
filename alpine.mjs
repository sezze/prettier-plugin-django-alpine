import prettier from "prettier";

const alpineExpressionAttributeMatch =
  /^:[\w\d-]+|x-(data|show|bind|text|html|model|modelable|if|id)([.\w\d\-:])*/;
const alpineNonExpressionAttributeMatch =
  /@[\w\d-]+|x-(init|on|effect)([.\w\d\-:])*/;

export const isAlpineAttribute = (attrName) => {
  return (
    alpineExpressionAttributeMatch.test(attrName) ||
    alpineNonExpressionAttributeMatch.test(attrName)
  );
};

export const formatAlpineAttribute = async (
  attrName,
  attrValue,
  options,
  col
) => {
  if (!attrValue) {
    return attrValue;
  }

  const isExpression = alpineExpressionAttributeMatch.test(attrName);
  const isValidButNotExpression =
    !isExpression && alpineNonExpressionAttributeMatch.test(attrName);
  if (!isExpression && !isValidButNotExpression) {
    return attrValue;
  }

  let formattedAttributeValue = await formatAlpineAttributeValue(
    attrValue,
    isExpression,
    options,
    col
  );

  return formattedAttributeValue;
};

async function formatAlpineAttributeValue(
  value,
  isValueExpression,
  options,
  col
) {
  const valueToFormat = isValueExpression ? `() => (${value})` : value;

  let f = "";
  try {
    f = await prettier.format(valueToFormat, {
      ...options,
      parser: "typescript",
      singleQuote: true,
      __embeddedInHtml: true,
    });

    // trim spaces
    f = f.trim();

    if (isValueExpression) {
      // Remove the () => from the formatted value using regex (ignore whitespace)
      f = f.replace(/\s*\(\s*\)\s*=>\s*/, "");
      // IF there's a ( at the start and a ) at the end, remove them
      f = f.trim();
      if (f.startsWith("(") && f.endsWith(")")) {
        f = f.slice(1, -1);
      } else if (f.startsWith("(") && f.endsWith(");")) {
        f = f.slice(1, -2);
      }
    }

    // Allow short values to be on one line, first, test if there's any new lines that are inside of template strings
    if (!/`[^`]*\n[^`]*`/.test(f) && f.includes("\n")) {
      const oneLineVersion = f.replace(/\n/g, " ");
      const finalWidth = oneLineVersion.length + col * options.tabWidth;
      if (finalWidth <= options.printWidth && oneLineVersion.length < 60) {
        f = oneLineVersion;
      }
    }

    // If any new line isn't followed by whitespace, indent it and put on new lines
    if (/\n[^\s{}]/.test(f)) {
      // indent first
      f = f.replace(/\n/g, "\n\t");
      f = `\n\t${f}\n`;
    } else {
      // remove any potential final semicolon
      if (f.endsWith(";")) {
        f = f.slice(0, -1);
      }
    }

    // Indent to match the attribute position
    const indentation = "\t".repeat(col);

    f = f.replace(/\n/g, `\n${indentation}`);

    // Remove trailing tabs
    f = f.replace(/\t+\n/g, "\n");
  } catch (error) {
    f = value;
  }

  return f;
}
