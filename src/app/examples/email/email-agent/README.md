# Email Assistant Agent

This is an AI agent built with Mastra that helps manage and interact with emails. The agent provides a conversational interface for users to compose, summarize, search, and organize their emails efficiently.

## Features

- **Email Composition**: Help write professional, clear emails
- **Email Summarization**: Provide concise summaries of long emails or threads
- **Email Search**: Find specific emails based on various criteria
- **Reply Generation**: Draft appropriate responses to incoming emails
- **Email Organization**: Assist with labeling, archiving, and organizing
- **Pattern Analysis**: Provide insights about email habits and patterns

## Getting Started

### Prerequisites

- Node.js v20.9.0 or higher
- OpenAI API key (for AI features)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your API keys:

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### Running the Agent

To start the agent in development mode:

```bash
npm run dev
```

The agent will be available at `http://localhost:4112`

To build the agent:

```bash
npm run build
```

To start the agent in production mode:

```bash
npm run start
```

## Usage

The agent can be interacted with through the Cedar chat interface in the email app. Here are some example queries:

### Email Composition

- "Help me write an email to my team about the project update"
- "Draft a formal email requesting a meeting"
- "Compose a thank you email with a professional tone"

### Email Summarization

- "Summarize this email thread"
- "What are the key points in this email?"
- "Give me the action items from this conversation"

### Email Search

- "Find emails from John about the budget"
- "Show me unread emails from this week"
- "Search for emails with attachments"

### Reply Generation

- "Generate a reply to this email"
- "Draft a casual response saying I'll review it"
- "Help me reply professionally to this request"

### Email Organization

- "Help me organize my inbox"
- "What labels should I use for these emails?"
- "Archive all resolved emails"

### Pattern Analysis

- "Analyze my email patterns this week"
- "Who are my top email senders?"
- "What's my average response time?"

## Architecture

The agent is built using Mastra and consists of:

1. **Tools** - Functions that allow the agent to interact with email data:

   - `composeEmailTool` - Compose new emails
   - `summarizeEmailTool` - Summarize email content
   - `searchEmailsTool` - Search for specific emails
   - `generateReplyTool` - Generate email replies
   - `organizeEmailTool` - Organize emails with labels
   - `analyzeEmailPatternsTool` - Analyze email patterns

2. **Agent** - The AI agent that uses the tools to respond to user queries

3. **API Endpoints** - RESTful endpoints for Cedar integration:
   - `/chat` - Regular text generation
   - `/chat/stream` - Streaming responses

## Integration with Cedar

The agent integrates seamlessly with the Cedar email app:

1. The email app uses Cedar's `SidePanelCedarChat` component
2. Cedar connects to the Mastra agent via the configured endpoints
3. The agent processes requests and returns responses in Cedar's expected format

## Environment Variables

```env
# Required for AI features
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Gmail integration (for future real email access)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/examples/email/api/auth/google/callback
```

## Development

### Adding New Tools

To add new email tools, create them in `src/mastra/tools/email-tools.ts`:

```typescript
export const newTool = createTool({
	id: 'new-tool',
	description: 'Description of what the tool does',
	inputSchema: z.object({
		// Define input parameters
	}),
	outputSchema: z.object({
		// Define output structure
	}),
	execute: async ({ context }) => {
		// Implementation
	},
});
```

### Customizing the Agent

Modify the agent's behavior in `src/mastra/agents/email-agent.ts`:

- Update the `instructions` to change how the agent responds
- Add or remove tools from the `tools` object
- Adjust the model settings for different AI capabilities

## License

ISC
