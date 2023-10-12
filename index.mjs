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

      // format all django tags
      const djangoTags =
        options.djangoTags && Object.values(options.djangoTags);
      djangoTags?.forEach((tag) => {
        tag.tag = formatDjangoTag(tag.tag);
      });

      const memory = new Set();

      const traverse = (node) => {
        if (typeof node === "string") {
          if (node.indexOf("__DJANGO_TAG_") === -1) return node;
          // Reinsert django tags
          djangoTags?.forEach((tag) => {
            node = node.replace(tag.key, formatDjangoTag(tag.tag));
          });
          return node;
        }
        if (memory.has(node)) return node;
        memory.add(node);

        if (node.contents) {
          node.contents = traverse(node.contents);
        } else if (node.parts) {
          node.parts = traverse(node.parts);
        } else if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            node[i] = traverse(node[i]);
          }
        }

        return node;
      };

      doc = traverse(doc);

      return doc;
    },
  },
};

export const defaultOptions = {
  singleQuote: true,
};

function formatDjangoTag(text) {
  // Remove all duplicate spaces that are not inside quotes
  return text.replace(
    / +(?=([^"\\]*(\\.|"([^"\\]*\\.)*[^"\\]*"))*[^"]*$)/g,
    " "
  );
}
