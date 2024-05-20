const { Configuration, OpenAIApi } = require("openai");

function parseInput(event) {
    const httpMethod = event.requestContext.http.method;
    let bodyData = {};

    switch (httpMethod) {
        case 'POST':
            if (event.body) {
                const decodedBody = Buffer.from(event.body, 'base64').toString();
                try {
                    bodyData = JSON.parse(decodedBody);
                } catch (error) {
                    throw new Error("Invalid JSON in request body");
                }
            } else {
                throw new Error("No data provided in request body");
            }
            break;
        case 'GET':
            if (event.queryStringParameters) {
                const { message } = event.queryStringParameters;
                if (message) {
                    bodyData.message = sanitizeInput(message);
                } else {
                    throw new Error("No message provided in query parameters");
                }
            } else {
                throw new Error("No query parameters provided");
            }
            break;
        default:
            throw new Error(`Unsupported HTTP method "${httpMethod}"`);
    }
    return bodyData;
}

function sanitizeInput(input) {
    return String(input).replace(/<script.*?>.*?<\/script>/gi, '').trim();
}

async function callOpenAI(message) {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    try {
        const response = await openai.createCompletion({
            model: "text-davinci-002", // Adjust the model as needed
            prompt: message,
            max_tokens: 150
        });
        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        throw new Error("Failed to fetch response from OpenAI");
    }
}

exports.handler = async (event) => {
    try {
        const requestBody = parseInput(event);
        const reply = await callOpenAI(requestBody.message);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // Configure as needed for CORS
            },
            body: JSON.stringify({ reply })
        };
    } catch (error) {
        return {
            statusCode: error.message.startsWith("No data") || error.message.startsWith("Invalid JSON") ? 400 : 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};