# Gmail-like Email App with Real Gmail Integration & Mastra AI Assistant

A fully functional email application built with Next.js, TypeScript, and Tailwind CSS that replicates Gmail's user interface and functionality. Now with **real Gmail integration** and **Mastra-powered AI Assistant** - connect your Gmail account to read and send actual emails, with an intelligent AI assistant to help you manage your inbox!

## Features

### 🤖 Mastra AI Assistant (NEW!)

- **Intelligent Email Agent**: Powered by Mastra framework with specialized email tools
- **Email Composition**: AI helps write professional, clear emails
- **Smart Summarization**: Get concise summaries of long email threads
- **Reply Generation**: Generate contextual responses with adjustable tone
- **Email Organization**: AI-powered labeling and archiving suggestions
- **Pattern Analysis**: Insights into your email habits and communication patterns
- **Streaming Responses**: Real-time AI responses with streaming support
- **Tool-Enhanced**: Uses specialized tools for email operations

### 🆕 Gmail Integration

- **OAuth Authentication**: Secure Google sign-in
- **Read Real Emails**: Fetch emails from your Gmail inbox
- **Send Emails**: Compose and send emails through Gmail
- **Labels Support**: Access your Gmail labels
- **Secure Token Storage**: OAuth tokens stored securely

### Core Functionality

- **Inbox Management**: View, read, and manage emails with a clean interface
- **Email Composition**: Full-featured compose window with To, Cc, Bcc fields
- **Search**: Search emails by subject, body, sender
- **Labels**: Organize emails with customizable labels
- **Starred & Important**: Mark emails as starred or important
- **Trash & Spam**: Move emails to trash or mark as spam

### UI/UX Features

- **Gmail-like Interface**: Familiar layout with sidebar navigation
- **Dark Mode Support**: Full dark mode theme
- **Responsive Design**: Works on desktop and tablet sizes
- **Density Settings**: Choose between comfortable, cozy, or compact view
- **AI Assistant Panel**: Collapsible side panel for AI assistance
- **Keyboard Shortcuts**: (Coming soon)
- **Drag & Drop**: (Coming soon)

### Email Actions

- Mark as read/unread
- Star/unstar emails
- Apply/remove labels
- Archive emails
- Delete emails
- Reply, Reply All, Forward

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **UI Components**: Custom components with shadcn/ui
- **AI Integration**: Cedar OS with Mastra Agent
- **AI Framework**: Mastra (agent orchestration)
- **Animation**: Motion (Framer Motion)

## Project Structure

```
email/
├── components/
│   ├── Header.tsx        # Top navigation bar with search
│   ├── Sidebar.tsx       # Left sidebar with navigation
│   ├── EmailList.tsx     # Main email list view
│   ├── ComposeEmail.tsx  # Compose email modal
│   └── GmailConnect.tsx  # Gmail connection component
├── store/
│   └── emailStore.ts     # Zustand store for state management
├── types/
│   └── index.ts          # TypeScript type definitions
├── email-agent/          # Mastra AI agent
│   ├── src/
│   │   └── mastra/
│   │       ├── agents/   # Email assistant agent
│   │       ├── tools/    # Email-specific tools
│   │       └── index.ts  # Agent configuration
│   ├── package.json
│   └── README.md
├── layout.tsx            # Root layout
└── page.tsx              # Main page with Cedar integration
```

## Getting Started

### Basic Setup (Mock Data)

1. Navigate to the email app:

   ```bash
   http://localhost:3000/examples/email
   ```

2. The app comes with mock data pre-loaded

3. Try these features:
   - Click "Compose" to write a new email
   - Click on any email to view it
   - Click the chat icon (right side) to open the AI assistant

### Mastra AI Assistant Setup

The email assistant uses a Mastra agent with specialized email tools.

#### Step 1: Set up the Mastra Agent

1. **Navigate to the agent directory**:

   ```bash
   cd src/app/examples/email/email-agent
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key
   ```

   Add to `.env`:

   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

4. **Start the agent**:

   ```bash
   npm run dev
   ```

   The agent will run on `http://localhost:4112`

#### Step 2: Configure the Email App

1. **Update environment variables** in the project root:

   ```bash
   cp src/app/examples/email/env.example .env.local
   # Edit .env.local
   ```

   Add to `.env.local`:

   ```env
   NEXT_PUBLIC_MASTRA_URL=http://localhost:4112
   ```

2. **Restart the Next.js app**:
   ```bash
   npm run dev
   ```

#### Step 3: Use the AI Assistant

- Click the chat button on the right side of the screen
- Ask for help with your emails
- The agent has specialized tools for:
  - Composing emails
  - Summarizing threads
  - Generating replies
  - Organizing inbox
  - Analyzing patterns

### Gmail Integration Setup

To connect your real Gmail account:

1. **Set up Google Cloud Project**

   - Follow the detailed instructions in [GMAIL_SETUP.md](./GMAIL_SETUP.md)
   - Create OAuth 2.0 credentials
   - Enable Gmail API

2. **Configure Environment Variables**

   - Add your Google Client ID and Secret to `.env.local`

3. **Connect Your Gmail**
   - Click "Connect Gmail Account" in the app
   - Authorize the app to access your Gmail
   - Your real emails will appear!

### Security Note

- Never commit your `.env.local` or `.env` files
- Keep your API keys secret
- In production, use secure token storage (database)
- Implement token refresh for long sessions

## Mastra Agent Features

The email assistant agent includes specialized tools:

### Available Tools

1. **composeEmailTool**: Compose new emails with AI assistance
2. **summarizeEmailTool**: Get concise summaries of email threads
3. **searchEmailsTool**: Find specific emails with natural language
4. **generateReplyTool**: Generate contextual email replies
5. **organizeEmailTool**: Organize emails with labels and folders
6. **analyzeEmailPatternsTool**: Analyze email habits and patterns

### Example Interactions

```
User: "Help me write a professional email to decline a meeting"
Agent: [Uses composeEmailTool to draft a polite decline email]

User: "Summarize this email thread about the project"
Agent: [Uses summarizeEmailTool to provide key points and action items]

User: "Generate a friendly reply saying I'll review it by Friday"
Agent: [Uses generateReplyTool with 'friendly' tone]

User: "Analyze my email patterns this week"
Agent: [Uses analyzeEmailPatternsTool to provide insights]
```

## Development

### Extending the Mastra Agent

To add new capabilities to the email assistant:

1. **Add new tools** in `email-agent/src/mastra/tools/email-tools.ts`
2. **Update agent instructions** in `email-agent/src/mastra/agents/email-agent.ts`
3. **Restart the agent** to apply changes

### Custom Email Tools

Example of adding a custom tool:

```typescript
export const customEmailTool = createTool({
	id: 'custom-tool',
	description: 'Description of the tool',
	inputSchema: z.object({
		// Define inputs
	}),
	outputSchema: z.object({
		// Define outputs
	}),
	execute: async ({ context }) => {
		// Implementation
	},
});
```

## Mock Data

The app includes 50 mock emails with realistic data including:

- Various senders with avatars
- Different subjects and body content
- Random dates within the last 30 days
- Some with attachments
- Mixed read/unread status

## Future Enhancements

- Email threading/conversation view
- Rich text editor for compose
- Attachment upload functionality
- Keyboard shortcuts
- Drag and drop to apply labels
- Multiple email selection with shift+click
- Email filters and rules
- Advanced AI features (auto-categorization, smart replies)
- Voice commands for email management
- Real-time Gmail sync with Mastra tools
- Progressive Web App (PWA) support
