// the DOM of the widgets the imageUpload plugin shows in the document

export interface UploadPlaceholderOptions {
  label: string;
  cancelLabel: string;
  /** an object url of the file */
  preview: string | null;
  onCancel: () => void;
}

const create = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] => {
  const element = doc.createElement(tag);
  element.className = className;
  return element;
};

const createProgressBar = (doc: Document, label: string): HTMLElement => {
  const bar = create(doc, 'span', 'NgxEditor__ImageUpload--Bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-label', label);
  bar.appendChild(create(doc, 'span', 'NgxEditor__ImageUpload--Fill'));
  return bar;
};

const createCancelButton = (doc: Document, label: string, onCancel: () => void): HTMLElement => {
  const button = create(doc, 'button', 'NgxEditor__ImageUpload--Cancel');
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.textContent = '×';
  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', onCancel);
  return button;
};

/** a preview of the file, a label, a progress bar and a cancel button */
export const renderUploadPlaceholder = (doc: Document, options: UploadPlaceholderOptions): HTMLElement => {
  const element = create(doc, 'span', 'NgxEditor__ImageUpload');
  element.contentEditable = 'false';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-label', options.label);

  if (options.preview) {
    const preview = create(doc, 'img', 'NgxEditor__ImageUpload--Preview');
    preview.src = options.preview;
    preview.alt = '';
    element.appendChild(preview);
  }

  const text = create(doc, 'span', 'NgxEditor__ImageUpload--Label');
  text.textContent = options.label;
  element.appendChild(text);

  element.appendChild(createProgressBar(doc, options.label));
  element.appendChild(createCancelButton(doc, options.cancelLabel, options.onCancel));
  return element;
};

/** the message of a failed upload */
export const renderUploadError = (doc: Document, message: string): HTMLElement => {
  const element = create(doc, 'span', 'NgxEditor__ImageUploadError');
  element.contentEditable = 'false';
  element.setAttribute('role', 'alert');
  element.textContent = message;
  return element;
};

export const setUploadProgress = (element: HTMLElement | null, percent: number): void => {
  element?.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', String(percent));

  const fill = element?.querySelector<HTMLElement>('.NgxEditor__ImageUpload--Fill');
  if (fill) {
    fill.style.inlineSize = `${percent}%`;
  }
};
