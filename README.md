## CKEditor5 editor component for Svelte 3

This component is a thin wrapper around ckeditor5 document editor.
Below are the set of instructions to create svelte project, install component and a basic setup with CKEditor DocumentEditor build.

### How to install package

```bash
$ npm i ckeditor5-svelte
```

### Getting started

#### Create a new svelte project and install dependencies

```bash
npx degit sveltejs/template my-svelte-project
# or download and extract
cd my-svelte-project
# to use Typescript run:
# node scripts/setupTypeScript.js

npm install
```

#### Install ckeditor5-svelte package

```bash
npm i ckeditor5-svelte
```

#### Install DocumentEditor build of ckeditor

```bash
npm i @ckeditor/ckeditor5-build-decoupled-document
```

#### Update App.svelte in your project with the following

```js
<script>
  import CKEditor from "ckeditor5-svelte";
  import DecoupledEditor from "@ckeditor/ckeditor5-build-decoupled-document/build/ckeditor";

  // Setting up editor prop to be sent to wrapper component
  let editor = DecoupledEditor;
  // Reference to initialised editor instance
  let editorInstance = null;
  // Setting up any initial data for the editor
  let editorData = "Hello World";

  // If needed, custom editor config can be passed through to the component
  // Uncomment the custom editor config if you need to customise the editor.
  // Note: If you don't pass toolbar object then Document editor will use default set of toolbar items.
  let editorConfig = {
    toolbar: {
      items: [
        "heading",
        "|",
        "fontFamily",
        "fontSize",
        "bold",
        "italic",
        "underline"
      ]
    }
  };

  function onReady({ detail: editor }) {
    // Insert the toolbar before the editable area.
    editorInstance = editor;
    editor.ui
      .getEditableElement()
      .parentElement.insertBefore(
        editor.ui.view.toolbar.element,
        editor.ui.getEditableElement()
      );
  }
</script>

<style>
</style>

<main>
  <div>
    <CKEditor
      bind:editor
      on:ready={onReady}
      bind:config={editorConfig}
      bind:value={editorData} />
  </div>
</main>
```

#### Run your project

```bash
npm run dev
```
