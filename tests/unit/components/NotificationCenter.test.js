import { mount } from '@vue/test-utils';

jest.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: jest.fn() }),
}));

jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('../../../src/stores/notifications', () => ({
  useNotificationsStore: () => ({
    items: [],
    unreadCount: 0,
    supported: false,
    permission: 'default',
    pushEnabled: false,
    busy: false,
    loaded: true,
    loading: false,
    hasMore: false,
    refreshPushState: jest.fn(),
  }),
}));

jest.mock('../../../src/utils/push', () => ({
  pushFailureReason: jest.fn(),
}));

import NotificationCenter from '../../../src/components/NotificationCenter.vue';

function pointerEvent({ pointerId = 1, clientY, currentTarget }) {
  return {
    pointerId,
    pointerType: 'touch',
    button: 0,
    clientY,
    currentTarget,
    preventDefault: jest.fn(),
  };
}

function mountCenter() {
  return mount(NotificationCenter, {
    props: { visible: true },
    global: { stubs: { Teleport: true, Transition: false } },
  });
}

describe('NotificationCenter.vue drag handle', () => {
  let wrapper;
  let handle;

  beforeEach(() => {
    handle = {
      setPointerCapture: jest.fn(),
      releasePointerCapture: jest.fn(),
    };
    wrapper = mountCenter();
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('expands after an upward drag', () => {
    const state = wrapper.vm.$.setupState;

    state.onPointerDown(pointerEvent({ clientY: 300, currentTarget: handle }));
    state.onPointerMove(pointerEvent({ clientY: 240, currentTarget: handle }));
    state.onPointerEnd(pointerEvent({ clientY: 240, currentTarget: handle }));

    expect(state.expanded).toBe(true);
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('collapses after dragging an expanded sheet down', () => {
    const state = wrapper.vm.$.setupState;
    state.expanded = true;

    state.onPointerDown(pointerEvent({ clientY: 100, currentTarget: handle }));
    state.onPointerMove(pointerEvent({ clientY: 180, currentTarget: handle }));
    state.onPointerEnd(pointerEvent({ clientY: 180, currentTarget: handle }));

    expect(state.expanded).toBe(false);
    expect(state.dragY).toBe(0);
  });

  it('dismisses after dragging a collapsed sheet down', () => {
    jest.useFakeTimers();
    const state = wrapper.vm.$.setupState;

    state.onPointerDown(pointerEvent({ clientY: 100, currentTarget: handle }));
    state.onPointerMove(pointerEvent({ clientY: 210, currentTarget: handle }));
    state.onPointerEnd(pointerEvent({ clientY: 210, currentTarget: handle }));
    jest.advanceTimersByTime(260);

    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
    jest.useRealTimers();
  });
});
