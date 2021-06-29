const { readFile, writeFile } = require('fs/promises');
const { createInterface } = require('readline');

module.exports = class Mjedit {
    constructor(filename, data, { silent = false } = {} ) {
        this.metadata = new Metadata(filename, data);
        this.silent = silent
    }

    async run() {
        await this.metadata.load(this.silent);
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
    // Using a static field to store the readline interface to make sure that
    // only one instance is used at a time.
    static rl = null;

    async ask(unsafeSetter, questionData) {
        await this.readlineAsync(() => this.askQuestions(unsafeSetter, questionData));
    }
    async readlineAsync(cb) {
        if (QuestionAsker.rl)
            throw new MjeditError("Readline already open");

        QuestionAsker.rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        await cb();

        QuestionAsker.rl.close();
        QuestionAsker.rl = null;
    }
    async askQuestions(unsafeSetter, questionData) {
        for (const [key, item] of questionData) {
            let required = true;
            while (required) {
                required = false;

                await this.questionHandler(item)
                    .then(result => unsafeSetter(key, result))
                    .catch(_ => required = item.required || false);

                if (required && item.requiredText)
                    await QuestionAsker.rl.write(item.requiredText + '\n');
            }
        }
    }
    async questionHandler({
        text,
        invalidText,
        validator = (_) => true,
        parser = (answer) => answer
    }) {
        let answer;

        while (true) {
            answer = parser(await this.questionAsync(text + ': '));

            if (validator(answer))
                break;
            if (invalidText)
                await QuestionAsker.rl.write(invalidText + '\n');
        }

        return answer;
    }
    questionAsync(text) {
        return new Promise((resolve, reject) => {
            QuestionAsker.rl.question(text, answer => {
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

    async load(silent) {
        await readFile(this.filename, 'utf8')
            .then(data => this.setAll(JSON.parse(data)))
            .catch(_ => {
                if (!silent)
                    console.error('No existing metadata file found for ' + this.filename)
            });
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
        await writeFile(this.filename, JSON.stringify(this.format()), 'utf8')
            .catch(err => console.error(`Error when trying to write into ${this.filename} : ${err}`));
    }
}
