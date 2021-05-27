const fs = require('fs');
const readline = require('readline');

module.exports = class Mjedit {
    constructor(filename, data) {
        this.metadata = new Metadata(filename, data);
    }

    async run() {
        this.metadata.load();
        await asyncReadlineQuestionHandler(async (questionHandler) => {
            await this.metadata.askQuestions(questionHandler)
        })
        this.metadata.save();
    }
}

class MjeditError extends Error {
    constructor(message) {
        super(message);
        this.name = "MjeditError";
    }
}

async function asyncReadlineQuestionHandler(asyncCb) {
    if (asyncReadlineQuestionHandler.open)
        throw new MjeditError("Readline already open");

    asyncReadlineQuestionHandler.open = true;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function asyncQuestion(text) {
        return new Promise((resolve, reject) => {
            rl.question(text, answer => {
                if (answer)
                    resolve(answer);
                else
                    reject(answer);
            });
        });
    }

    async function questionHandler(text, validateCb, parseCb = (answer) => answer) {
        let answer;

        do {
            answer = parseCb(await asyncQuestion(text + ': '));
        } while (!validateCb(answer));

        return answer;
    }

    await asyncCb(questionHandler);

    rl.close();

    asyncReadlineQuestionHandler.open = false;
}

class Metadata {
    constructor(filename, data) {
        this.filename = filename.split('.')[0] + '.json';
        this.data = data;
        this.keys = Object.keys(this.data);
    }

    set(key, value, alreadyValidated = false) {
        if (alreadyValidated || this.data[key].validator(value))
            this.data[key].value = value;
    }
    setAll(data) {
        this.keys.forEach((key) => this.set(key, data[key]));
    }

    load() {
        try {
            const oldMetadata = JSON.parse(fs.readFileSync('./' + this.filename, 'utf8'));
            this.setAll(oldMetadata);
        } catch (e) {
            console.log('No existing metadata file found for ' + this.filename);
        }
    }
    async askQuestions(questionHandler) {
        for (const key of this.keys) {
            const item = this.data[key];

            let required = true;
            while (required) {
                required = false;

                await questionHandler(item.text, item.validator, item.parser)
                    .then((result) => this.set(key, result, true))
                    .catch((e) => required = item.required || false);
            }
        }
    }
    format() {
        let formatedMetadata = {};
        this.keys.forEach((key) => formatedMetadata[key] = this.data[key].value);
        return formatedMetadata;
    }
    save() {
        fs.writeFileSync(this.filename, JSON.stringify(this.format()));
    }
}
