import htmlParserPlugin from "prettier/plugins/html";
import { formatAlpineAttribute, isAlpineAttribute } from "./alpine.mjs";
import { replaceDjangoTags } from "./django.mjs";

const htmlParser = htmlParserPlugin.parsers.html;
const htmlPrinter = htmlParserPlugin.printers.html;

/** @type {Record<string, import('prettier').Parser>} */
export const parsers = {
  html: {
    ...htmlParser,
    preprocess(text, options) {
      // Remove django template tags with placeholders
      const { djangoTags, newString, nesting } = replaceDjangoTags(text);

      // Store them for later
      options.djangoTags = djangoTags;
      options.nesting = nesting;

      return newString;
    },
  },
};

// Perform custom Alpine and Django printing, including reinserting Django tags
/** @type {Record<string, import('prettier').Printer>} */
export const printers = {
  html: {
    ...htmlPrinter,
    preprocess: async (ast, options) => {
      ast = htmlPrinter.preprocess(ast, options);

      // Find Alpine directives and format them
      const traverse = async (node) => {
        if (node.type === "element") {
          if (node.attrs) {
            for (const attr of node.attrs) {
              if (attr.name && attr.value && isAlpineAttribute(attr.name)) {
                attr.value = await formatAlpineAttribute(
                  attr.name,
                  attr.value,
                  options,
                  options.nesting[attr.valueSpan.start.line]
                );
              }
            }
          }
        }
        if (node.children) {
          for (const child of node.children) {
            await traverse(child);
          }
        }
      };
      await traverse(ast);
      return ast;
    },
    print(path, options, print) {
      let doc = htmlPrinter.print(path, options, print);
      let stringified = JSON.stringify(doc);
      const djangoTags = options.djangoTags;

      // Reinsert django tags
      Object.values(djangoTags).forEach((tag) => {
        stringified = stringified.replace(tag.key, formatDjangoTag(tag.tag));
      });

      doc = JSON.parse(stringified);

      return doc;
    },
  },
};

export const defaultOptions = {
  singleQuote: true,
};

function formatDjangoTag(text) {
  // Remove all duplicate spaces that are not inside quotes
  return (
    text
      .replace(/ +(?=([^"\\]*(\\.|"([^"\\]*\\.)*[^"\\]*"))*[^"]*$)/g, " ")
      // Then escape all double quotes
      .replace(/"/g, '\\"')
  );
}
