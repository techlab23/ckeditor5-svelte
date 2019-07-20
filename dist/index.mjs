function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
    const component = current_component;
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function flush() {
    const seen_callbacks = new Set();
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                callback();
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
}
function update($$) {
    if ($$.fragment) {
        $$.update($$.dirty);
        run_all($$.before_update);
        $$.fragment.p($$.dirty, $$.ctx);
        $$.dirty = null;
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    if (component.$$.fragment) {
        run_all(component.$$.on_destroy);
        component.$$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        component.$$.on_destroy = component.$$.fragment = null;
        component.$$.ctx = {};
    }
}
function make_dirty(component, key) {
    if (!component.$$.dirty) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty = blank_object();
    }
    component.$$.dirty[key] = true;
}
function init(component, options, instance, create_fragment, not_equal, prop_names) {
    const parent_component = current_component;
    set_current_component(component);
    const props = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props: prop_names,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty: null
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, props, (key, value) => {
            if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                if ($$.bound[key])
                    $$.bound[key](value);
                if (ready)
                    make_dirty(component, key);
            }
        })
        : props;
    $$.update();
    ready = true;
    run_all($$.before_update);
    $$.fragment = create_fragment($$.ctx);
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

var justDebounceIt = debounce;

function debounce(fn, wait, callFirst) {
  var timeout;
  return function() {
    if (!wait) {
      return fn.apply(this, arguments);
    }
    var context = this;
    var args = arguments;
    var callNow = callFirst && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      if (!callNow) {
        return fn.apply(context, args);
      }
    }, wait);

    if (callNow) {
      return fn.apply(this, arguments);
    }
  };
}

/* src/Ckeditor.svelte generated by Svelte v3.6.7 */

function create_fragment(ctx) {
	var div;

	return {
		c() {
			div = element("div");
		},

		m(target, anchor) {
			insert(target, div, anchor);
			ctx.div_binding(div);
		},

		p: noop,
		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			ctx.div_binding(null);
		}
	};
}

const INPUT_EVENT_DEBOUNCE_WAIT = 300;

function instance_1($$self, $$props, $$invalidate) {
	
  
  // Properties
  let { editor = null, value = '', config = () => ({}) } = $$props;
  let { disabled = false } = $$props;

  // Instance variables
  let instance = null;
  let lastEditorData = '';
  let editorElement;
  const dispatch = createEventDispatcher();

  function watchValue(x) {
    if (instance && x !== lastEditorData){
      instance.setData(x);
    }
  }


  onMount( () => {
    
    // If value is passed then add it to config
    if(value) {
      Object.assign(config, {
        initialData: value
      });
    }

    editor.create(editorElement, config)
    .then(editor => {

        // Save the reference to the instance for future use.
        instance = editor;

        // Set initial disabled state.
        editor.isReadOnly = disabled;
        
        // Let the world know the editor is ready.
        dispatch('ready', editor);

        setUpEditorEvents();

    })
    .catch( error => {
        console.error( error );
    });

  });

  onDestroy(() => {
    
    if (instance ) {
      instance.destroy();
      instance = null;
    }

    // Note: By the time the editor is destroyed (promise resolved, editor#destroy fired)
    // the Vue component will not be able to emit any longer. So emitting #destroy a bit earlier.
    dispatch('destroy', instance);
  });

  function setUpEditorEvents() {
      const emitInputEvent = evt => {
        // Cache the last editor data. This kind of data is a result of typing,
        // editor command execution, collaborative changes to the document, etc.
        // This data is compared when the component value changes in a 2-way binding.
        const data = value = lastEditorData = instance.getData();
        dispatch('input', { data, evt, instance }); $$invalidate('value', value);
      };

      // Debounce emitting the #input event. When data is huge, instance#getData()
      // takes a lot of time to execute on every single key press and ruins the UX.
      instance.model.document.on( 'change:data', 
        justDebounceIt( emitInputEvent, INPUT_EVENT_DEBOUNCE_WAIT ));

      instance.editing.view.document.on( 'focus', evt => {
        dispatch('focus',{ evt, instance });
      });

      instance.editing.view.document.on( 'blur', evt => {
        dispatch('blur', { evt, instance });
      });
    }

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('editorElement', editorElement = $$value);
		});
	}

	$$self.$set = $$props => {
		if ('editor' in $$props) $$invalidate('editor', editor = $$props.editor);
		if ('value' in $$props) $$invalidate('value', value = $$props.value);
		if ('config' in $$props) $$invalidate('config', config = $$props.config);
		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
	};

	$$self.$$.update = ($$dirty = { value: 1 }) => {
		if ($$dirty.value) { watchValue(value); }
	};

	return {
		editor,
		value,
		config,
		disabled,
		editorElement,
		div_binding
	};
}

class Ckeditor extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance_1, create_fragment, safe_not_equal, ["editor", "value", "config", "disabled"]);
	}
}

export default Ckeditor;
