const { defineComponent, h } = require('vue');

const PrimeVueDialogStub = defineComponent({
  name: 'PrimeVueDialogStub',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible'],
  setup(props, { slots }) {
    return () => (props.visible ? h('div', { class: 'p-dialog-stub' }, slots.default?.()) : null);
  },
});

module.exports = PrimeVueDialogStub;
