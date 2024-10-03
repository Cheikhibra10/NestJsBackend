declare module 'twilio' {
    export = Twilio;

    class Twilio {
        constructor(accountSid: string, authToken: string);
        messages: {
            create(options: {
                body: string;
                from: string;
                to: string;
            }): Promise<any>;
        };
    }
}
