// table cells of the sample tables
const cell = (text: string, attrs: Record<string, unknown> = {}, type = 'table_cell') => ({
  type,
  attrs,
  content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
});

const header = (text: string, attrs: Record<string, unknown> = {}) => cell(text, attrs, 'table_header');

const row = (...cells: ReturnType<typeof cell>[]) => ({ type: 'table_row', content: cells });

export default {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: {
        level: 1,
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'Hello',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'This is editable text. You can focus it and start typing.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'To apply styling, you can select a piece of text and manipulate its styling from the menu. The basic schema supports ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'em',
            },
          ],
          text: 'emphasis',
        },
        {
          type: 'text',
          text: ', ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'strong',
            },
          ],
          text: 'strong text',
        },
        {
          type: 'text',
          text: ', ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'u',
            },
          ],
          text: 'underline',
        },
        {
          type: 'text',
          text: ', ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 's',
            },
          ],
          text: 'strike',
        },
        {
          type: 'text',
          text: ', ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'http://marijnhaverbeke.nl/blog',
                title: null,
                target: null,
              },
            },
          ],
          text: 'links',
        },
        {
          type: 'text',
          text: ', ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'code',
            },
          ],
          text: 'code font',
        },
        {
          type: 'text',
          text: '.',
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          attrs: {
            align: null,
          },
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'strong',
                },
              ],
              text: 'Blockquote: ',
            },
            {
              type: 'text',
              text: 'Lorem Ipsum is ',
            },
            {
              type: 'text',
              marks: [
                {
                  type: 'text_background_color',
                  attrs: {
                    backgroundColor: '#fbca04',
                  },
                },
              ],
              text: 'simply dummy',
            },
            {
              type: 'text',
              text: ' text of the printing and typesetting industry. ',
            },
            {
              type: 'text',
              marks: [
                {
                  type: 'em',
                },
              ],
              text: 'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s',
            },
            {
              type: 'text',
              text: ', when an unknown printer took a galley of type and scrambled it to make a type specimen book.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: {
        level: 2,
        align: null,
        dir: 'rtl',
      },
      content: [
        {
          type: 'text',
          text: 'متن دوزبانه',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'این پاراگراف فارسی است و واژه‌های ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'strong',
            },
          ],
          text: 'English',
        },
        {
          type: 'text',
          text: ' و عددهایی مانند 2026 و 3.14 را در میان خود دارد. در حالت «Auto per paragraph» جهت آن از نخستین حرفش تعیین می‌شود.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          marks: [
            {
              type: 'font_family',
              attrs: { family: 'Vazirmatn, sans-serif' },
            },
          ],
          text: 'این سطر با قلم وزیرمتن نوشته شده است؛ قلم هر بخش از متن را از منوی «قلم» (Font) انتخاب کنید.',
        },
      ],
    },
    {
      type: 'bullet_list',
      attrs: {
        dir: 'rtl',
      },
      content: [
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'نوشتن متن فارسی با نیم‌فاصله',
                },
              ],
            },
          ],
        },
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'کلمه‌های English در میان جمله',
                },
              ],
            },
          ],
        },
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'عددها: 1، 2 و 3',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: {
        level: 2,
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'Tables',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'Insert a table with the grid picker and change it from the table dropdown: cell alignment, background, striped or borderless variants, full width and alignment of the table.',
        },
      ],
    },
    {
      type: 'table',
      attrs: { variant: 'striped', width: 'full', align: 'start' },
      content: [
        row(header('Feature'), header('Status', { align: 'center' }), header('Notes')),
        row(cell('Grid picker'), cell('Done', { align: 'center' }), cell('Up to 10 × 10')),
        row(cell('Cell background'), cell('Done', { align: 'center', background: '#c2e0c6' }), cell('Colour palette')),
        row(cell('Column resizing'), cell('Done', { align: 'center' }), cell('Also in right to left tables', { valign: 'middle' })),
      ],
    },
    {
      type: 'table',
      attrs: { dir: 'rtl', variant: 'bordered', width: 'auto', align: 'center' },
      content: [
        row(header('شهر'), header('جمعیت', { align: 'end' }), header('استان')),
        row(cell('تهران'), cell('9,000,000', { align: 'end' }), cell('تهران')),
        row(cell('مشهد'), cell('3,300,000', { align: 'end' }), cell('خراسان رضوی')),
        row(cell('کرمانشاه'), cell('950,000', { align: 'end' }), cell('کرمانشاه', { background: '#fef2c0' })),
      ],
    },
    {
      type: 'heading',
      attrs: {
        level: 2,
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'The code block is a code editor',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'This editor has been wired up to render code blocks as instances of the ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'https://codemirror.net',
                title: 'https://codemirror.net',
                target: '_blank',
              },
            },
          ],
          text: 'CodeMirror',
        },
        {
          type: 'text',
          text: ' code editor, which provides ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'https://en.wikipedia.org',
                title: '',
                target: '_blank',
              },
            },
          ],
          text: 'syntax highlighting',
        },
        {
          type: 'text',
          text: ', auto-indentation, and similar.',
        },
      ],
    },
    {
      type: 'code_mirror',
      content: [
        {
          type: 'text',
          text: 'function max(a, b) {\n  return a > b ? a : b;\n}',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: null,
      },
      content: [
        {
          type: 'text',
          text: 'The content of the code editor is kept in sync with the content of the code block in the rich text editor, so that it is as if you\'re directly editing the outer document, using a more convenient interface.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: {
        align: 'center',
      },
      content: [
        {
          type: 'image',
          attrs: {
            src: 'https://gameranx.com/wp-content/uploads/2016/03/Rise-of-the-Tomb-Raider-4K-Wallpaper-3.jpg',
            alt: 'Lara Croft',
            title: 'Lara Croft - Tomb Raider',
            width: '578px',
          },
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            src: '/ngx-editor.svg',
            alt: 'ngx-editor logo',
            title: null,
            width: '120px',
            align: 'end',
          },
        },
        {
          type: 'text',
          text: 'An image aligned to the end of the line: the text flows around it, on the left in left to right text and on the right in right to left text. Select it for the image toolbar: alignment, alt text, caption, link, replace and delete; drag the handles on its inline-end corners to resize it.',
        },
      ],
    },
    {
      type: 'figure',
      attrs: {
        src: '/ngx-editor.svg',
        alt: 'ngx-editor logo',
        title: null,
        width: '200px',
        align: 'center',
        caption: 'A captioned image (figure). Paste, drop or upload images to try the upload pipeline.',
        href: null,
      },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Videos: paste a YouTube, Vimeo or Aparat link (or embed code) in the video dialog, or upload a video file. Click a video to select it: the toolbar aligns it, sets its width (or drag the handle on its inline-end edge), adds a caption, replaces or deletes it. Click it again to play it.',
        },
      ],
    },
    {
      type: 'video',
      attrs: {
        kind: 'embed',
        src: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
        provider: 'youtube',
        width: null,
        align: null,
        poster: null,
        caption: 'Big Buck Bunny on YouTube (privacy-enhanced mode)',
        ratio: '16/9',
      },
    },
    {
      type: 'video',
      attrs: {
        kind: 'embed',
        src: 'https://player.vimeo.com/video/76979871',
        provider: 'vimeo',
        width: '50%',
        align: 'center',
        poster: null,
        caption: 'A Vimeo video, 50% wide and centered',
        ratio: '16/9',
      },
    },
    {
      type: 'video',
      attrs: {
        kind: 'embed',
        src: 'https://www.aparat.com/video/video/embed/videohash/pRQCm/vt/frame',
        provider: 'aparat',
        width: '75%',
        align: null,
        poster: null,
        caption: 'ویدیوی آپارات',
        ratio: '16/9',
      },
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'The end.' }],
    },
  ],
};
