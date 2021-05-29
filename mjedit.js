const util = require('util');
const fs = require('fs');
const readline = require('readline');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

module.exports = class Mjedit {
    //TODO otion to remove the log when metadata file non existant
    constructor(filename, data) {
        this.metadata = new Metadata(filename, data);
    }

    async run() {
        await this.metadata.load();
        await new QuestionAsker().ask(
            this.metadata.getUnsafeSetter(),
            this.metadata.getQuestions()
        );
        await this.metadata.save();
    }
}

class MjeditError extends Error {
    constructor(message) {
        super(message);
        this.name = "MjeditError";
    }
}

class QuestionAsker {
    static rl = null;
    async ask(unsafeSetter, questionData) {
        await this.readlineAsync(() => this.askQuestions(unsafeSetter, questionData));
    }
    async readlineAsync(cb) {
        if (this.rl)
            throw new MjeditError("Readline already open");
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        await cb();

        this.rl.close();
        this.rl = null;
    }
    async askQuestions(unsafeSetter, questionData) {
        for (const [key, item] of questionData) {
            let required = true;
            while (required) {
                required = false;

                await this.questionHandler(item)
                    .then((result) => unsafeSetter(key, result))
                    .catch((e) => required = item.required || false);

                if (required && item.requiredText)
                    await this.rl.write(item.requiredText + '\n');
            }
        }
    }
    async questionHandler({
        text,
        invalidText,
        validator = (value) => true,
        parser = (answer) => answer
    }) {
        let answer;

        while (true) {
            answer = parser(await this.questionAsync(text + ': '));

            if (validator(answer))
                break;
            if (invalidText)
                await this.rl.write(invalidText + '\n');
        }

        return answer;
    }
    questionAsync(text) {
        return new Promise((resolve, reject) => {
            this.rl.question(text, answer => {
                if (answer)
                    resolve(answer);
                else
                    reject(answer);
            });
        });
    }
}

class Metadata {
    constructor(filename, data) {
        this.filename = filename;
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

    async load() {
        await readFileAsync(this.filename, 'utf8')
            .then(data => this.setAll(JSON.parse(data)))
            .catch(err => console.log('No existing metadata file found for ' + this.filename));
    }
    //Unsafe because we bypass the data validator
    getUnsafeSetter() {
        return (key, value) => {
            this.set(key, value, true);
        }
    }
    getQuestions() {
        return Object.entries(this.data);
    }
    format() {
        let formatedMetadata = {};
        this.keys.forEach((key) => formatedMetadata[key] = this.data[key].value);
        return formatedMetadata;
    }
    async save() {
        fs.writeFileSync(this.filename, JSON.stringify(this.format()), 'utf8');
        await writeFileAsync(this.filename, JSON.stringify(this.format()), 'utf8')
            .catch(err => console.log(`Error when trying to write into ${this.filename} : ${err}`));
    }
}
