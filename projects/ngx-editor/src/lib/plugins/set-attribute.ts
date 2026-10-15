// sets an attribute on the element, or removes it when the value is not a non-empty string
export const setOptionalAttribute = (element: HTMLElement, name: string, value: unknown): void => {
  if (typeof value === 'string' && value) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
};

export default setOptionalAttribute;
