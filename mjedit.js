const fs = require('fs');
const readline = require('readline');

module.exports = class Mjedit {
    constructor(filename, data) {
        this.metadata = new Metadata(filename, data);
    }

    async run() {
        //TODO use async load/save
        this.metadata.load();
        await new QuestionAsker().ask(
            this.metadata.getUnsafeSetter(),
            this.metadata.getQuestions()
        );
        this.metadata.save();
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
        await this.asyncReadline(() => this.askQuestions(unsafeSetter, questionData));
    }
    async asyncReadline(cb) {
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
            answer = parser(await this.asyncQuestion(text + ': '));

            if (validator(answer))
                break;
            if (invalidText)
                await this.rl.write(invalidText + '\n');
        }

        return answer;
    }
    asyncQuestion(text) {
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

    load() {
        try {
            const oldMetadata = JSON.parse(fs.readFileSync('./' + this.filename, 'utf8'));
            this.setAll(oldMetadata);
        } catch (e) {
            console.log('No existing metadata file found for ' + this.filename);
        }
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
    save() {
        fs.writeFileSync(this.filename, JSON.stringify(this.format()));
    }
}
