const fs = require('fs');
const readline = require('readline');

module.exports = class Mjedit {
    constructor(filename, data) {
        this.metadata = new Metadata(filename, data);
    }

    async run() {
        this.metadata.load();
        await asyncReadlineUse(async ({ asyncQuestion }) => {
            await this.metadata.askQuestions(questionHandler.bind(asyncQuestion));
        });
        this.metadata.save();
    }
}

async function asyncReadlineUse(asyncCb) {
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

    await asyncCb({rl, asyncQuestion});

    rl.close();
}

async function questionHandler(key, text, validateCb, parseCb = (answer) => answer) {
    let answer;

    do {
        answer = parseCb(await this(text + ': '));
    } while (!validateCb(answer));

    return answer;
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
        } catch (err) {
            console.log('No existing metadata file found for ' + metadataFilename);
        }
    }
    async askQuestions(questionHandler) {
        for (const key of this.keys) {
            const item = this.data[key];
            await questionHandler(key, item.text, item.validator, item.parser)
                .then((result) => this.set(key, result, true))
                .catch((err) => {});
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
