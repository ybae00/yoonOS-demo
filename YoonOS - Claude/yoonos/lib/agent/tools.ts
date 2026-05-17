import Anthropic from '@anthropic-ai/sdk';

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'open_app',
    description: 'Opens one of the OS apps and brings it to the foreground.',
    input_schema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          enum: ['browser', 'calendar', 'photobooth', 'textedit', 'systemsettings'],
          description: 'The app to open.',
        },
      },
      required: ['app_name'],
    },
  },
  {
    name: 'navigate_browser',
    description: 'Navigates the Browser app to a given URL. Make sure to open the browser app first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to navigate to (include https://).',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_browser_content',
    description: 'Returns the plain text content of the currently loaded page in the Browser app. Use this after navigating to read what is on the page.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'type_in_text_editor',
    description: 'Writes or appends text content to the currently active file in the Text Edit app. Opens the app if not already open.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The text to write into the editor.',
        },
        mode: {
          type: 'string',
          enum: ['replace', 'append'],
          description: 'Whether to replace existing content or append to it. Default: replace.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_text_editor_content',
    description: 'Returns the current text content of the active file in the Text Edit app.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Creates a new event in the Calendar app.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'The date for the event in YYYY-MM-DD format.',
        },
        title: {
          type: 'string',
          description: 'The title or name of the event.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or description for the event.',
        },
      },
      required: ['date', 'title'],
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Returns all events for a given date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'The date to query in YYYY-MM-DD format.',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'capture_photo',
    description: 'Triggers the Photo Booth app to take a photo using the webcam.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_user_file',
    description: "Reads the content of a file in the user's Text Edit by name.",
    input_schema: {
      type: 'object' as const,
      properties: {
        file_name: {
          type: 'string',
          description: 'The name (or partial name) of the file to read.',
        },
      },
      required: ['file_name'],
    },
  },
];
