import {
    DynamoDBClient
} from "@aws-sdk/client-dynamodb";

import {
    DynamoDBDocumentClient,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";

import { randomUUID } from "crypto";

const ddbDcoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: "eu-north-1" })
)

export const handler = async (event) => {
    try {
        const { book, lang } = JSON.parse(event.body);
        console.info({ book, lang });
        if (!book || !lang ) {
            return {
                statusCode: 400,
                success: false,
                message: 'Missing required parameters',
                data: []
            }
        }

        if (book.length < 3) {
            return {
                statusCode: 400,
                success: false,
                message: 'Book name is too short',
                data: []
            }
        }

        if (lang.length !== 2) {
            return {
                statusCode: 400,
                success: false,
                message: 'Language code is two characters'
            }
        }

        const newBook = book.replaceAll(" ", '+');
        const urlOL = `${process.env.Open_Library_URL}search.json?q=${newBook.toLowerCase()}&lang=${process.env.LANG}&limit=${process.env.LIMIT}`;
        console.info({ urlOL });

        const resultOL = await fetch(urlOL).then(res => res.json());

        for (let index = 0; index < resultOL.docs.length; index++) {
            const element = resultOL.docs[index];
            const insertBook = {
                id: randomUUID(),
                title: element.title,
                author: element.author_name ? element.author_name[0] : 'Unknown',
                publish_year: element.first_publish_year,
            };

            await ddbDcoClient.send(
                new PutCommand({
                    TableName: "books",
                    Item: insertBook
                })
            );
        }

        const response = {
            statusCode: 201,
            success: true,
            message: 'Books found and saved successfully'
        };
        return response;

    } catch (error) {
        return {
            statusCode: 500,
            success: false,
            message: JSON.stringify(error)
        }
    }
};
