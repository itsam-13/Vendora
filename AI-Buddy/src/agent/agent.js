const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ToolMessage, AIMessage } = require('@langchain/core/messages');
const tools = require('./tool');

let model;

function getModel() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Missing Google API key. Set GOOGLE_API_KEY or GEMINI_API_KEY in your .env file.');
    }

    if (!model) {
        model = new ChatGoogleGenerativeAI({
            apiKey,
            model: 'gemini-2.0-flash',
            temperature: 0.5,
        });
    }

    return model;
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode('chat', async (state, config) => {
        const response = await getModel().invoke(state.messages, {
            tools: [tools.searchProduct, tools.addProductToCart],
        });

        const toolCalls = response.tool_calls ?? [];

        if (toolCalls.length > 0) {
            const toolResults = await Promise.all(
                toolCalls.map(async (call) => {
                    const tool = tools[call.name];
                    if (!tool) {
                        throw new Error(`Tool ${call.name} not found`);
                    }

                    const toolInput = call.args ?? {};
                    const toolResult = await tool.func({
                        ...toolInput,
                        token: config?.metadata?.token,
                    });

                    return new ToolMessage({
                        content: String(toolResult),
                        name: call.name,
                        tool_call_id: call.id,
                    });
                })
            );

            state.messages.push(...toolResults);
            const followUpResponse = await getModel().invoke(state.messages, {
                tools: [tools.searchProduct, tools.addProductToCart],
            });

            state.messages.push(
                new AIMessage({
                    content: followUpResponse.text,
                    tool_calls: followUpResponse.tool_calls,
                })
            );

            return state;
        }

        state.messages.push(
            new AIMessage({
                content: response.text,
                tool_calls: response.tool_calls,
            })
        );

        return state;
    })
    .addEdge('__start__', 'chat')
    .addEdge('chat', '__end__');

const agent = graph.compile();

module.exports = agent;