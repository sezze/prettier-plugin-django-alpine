# Django + Alpine.js formatting support in HTML

This Prettier plugin adds support for formatting Django and Alpine.js code in HTML files. Intended for use with Django templates using Alpine.js.

Django tags are mostly unmodified, only whitespace changes.

Alpine.js directives use modified JavaScript formatting.

If you want to format Alpine.js but you don't use Django, then this should still work just fine.

## Installation

Install [prettier](https://prettier.io/) and this plugin:

```bash
npm i -D prettier-plugin-django-alpine
```

## Usage

Add the plugin to your `.prettierrc` file:

```json
{
  "plugins": ["prettier-plugin-django-alpine"]
}
```

Or use it directly:

```bash
prettier --write --plugin=prettier-plugin-django-alpine "**/*.html"
```

## Known issues

Currently I could not find a way to get the HTML tag indentation level after formatting, so if your tag is improperly indented and your Alpine.js directive is a multi-line directive, then you will need to run the formatter twice to get the correct indentation.

TLDR: If you get the wrong indentation, try running the formatting again.
