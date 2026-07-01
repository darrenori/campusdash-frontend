import { mount } from '@vue/test-utils';
import MessageBubble from '../../../../src/components/messages/MessageBubble.vue';

const baseMessage = {
  id: 1,
  conversationId: 7,
  body: 'hello',
  imageUrl: null,
  createdAt: '2026-01-02T03:04:00.000Z',
  sender: { id: 2, name: 'Bob' },
};

const mountBubble = (message = {}, props = {}) =>
  mount(MessageBubble, {
    props: {
      message: { ...baseMessage, ...message },
      ...props,
    },
  });

describe('MessageBubble', () => {
  it('renders message bodies as text, not markup', () => {
    const wrapper = mountBubble({ body: '<img src=x onerror=alert(1)>hi' });

    expect(wrapper.find('.bubble-text').text()).toBe('<img src=x onerror=alert(1)>hi');
    expect(wrapper.html()).toContain('&lt;img src=x onerror=alert(1)&gt;hi');
    expect(wrapper.find('img[src="x"]').exists()).toBe(false);
  });

  it('resolves uploaded image URLs and marks own messages', () => {
    const wrapper = mountBubble({ imageUrl: '/uploads/messages/a.png' }, { mine: true });

    expect(wrapper.classes()).toContain('mine');
    expect(wrapper.find('.bubble-image').attributes('src')).toBe(
      'http://localhost:9000/uploads/messages/a.png'
    );
  });
});
