<div>
  <CKEditor bind:editor={editor} on:ready={onReady} bind:value={editorData} bind:config={editorConfig}></CKEditor>
</div>

<div style="margin-top:40px; margin-left:10px">
  <h4>HTML Output</h4>
  {editorData}
</div>

<script>
  // Can use svelte component directly if needed
  // import CKEditor from '../../ckeditor5-svelte/src/index.svelte'

  //Can use ES build as well
  import CKEditor from '../../dist/index.mjs'
  import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';


  let editor = DecoupledEditor
  let editorInstance = null  
  let editorData = "Hello World"
  
  // If needed, custom editor config can be passed through to the component 
  // Uncomment the custom editor config if you need to customise the editor.
  let editorConfig = {
    // toolbar: {
    //   items: [
    //     'heading',
    //     "|",
    //     "fontFamily",
    //     "fontSize",
    //     "bold",
    //     "italic",
    //     "underline"
    //   ]
    // }
  }

  function onReady( { detail: editor } )  {
    // Insert the toolbar before the editable area.
    editorInstance = editor
    editor.ui.getEditableElement().parentElement.insertBefore(
        editor.ui.view.toolbar.element,
        editor.ui.getEditableElement()
    )
  }
</script>
