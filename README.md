# mjedit

```js
const Mjedit = require('mjedit');
const mjedit = new Mjedit(
    filename,
    {
        propName: {
            // Default value
            value: Any,
            
            // Text printed to the user
            text: String,
            
            // Text printed to the user when the validator function return false
            invalidText: [String],
            
            // Return true is the value is valid, false otherwise
            validator: [(value)],
            
            // Return a transformed value from the answer
            parser: [(answer)],
            
            // Indicates if the input is required, default false
            required: [Bool],
            
            // Text printed to the user when a required field was left empty
            requiredText: [String]
        }
    },
    {
        // Will not warn you if the file "filename" is not found, default false
        silent = [true]
    }
)
```

\[\] -> Optionals fields

\(arg\) -> Functions that take arg as argument

```js
// Load the file (filename) as json if it exist
// Ask the questions to the user through stdin
// Save resulting data to the file as json
mjedit.run(); // async function
```

## Example

```js
const Mjedit = require('mjedit');
const mjedit = new Mjedit(
    'hello_mjedit.json',
    {
        idValid: {
            value: false,
            text: 'Are ids valid? (true/false)',
            validator: (value) => ['true', 'false'].includes(value),
            required: true,
            requiredText: 'You must specify if ids are valid'
        },
        ids: {
            value: [],
            text: 'Enter ids (csv)',
            invalidText: 'Invalid ids, each id should be 10 characteres long',
            validator: (ids) => ids.every(id => id.length === 10),
            parser: (answer) => answer.split(',').map(id => id.trim())
        }
    }
);

mjedit.run();
```

    $ node app.js
    No existing metadata file found for hello_mjedit.json
    Are ids valid? (true/false): true
    Enter ids (csv): 1234567890, 12345
    Invalid ids, each id should be 10 characteres long
    Enter ids (csv): 1234567890, 1234554321

    $ cat hello_mjedit.json
    {"idValid":"true","ids":["1234567890","1234554321"]}

    $ node app.js
    Are ids valid? (true/false):
    You must specify if ids are valid
    Are ids valid? (true/false): true
    Enter ids (csv): 1111111111

    $ cat hello_mjedit.json
    {"idValid":"true","ids":["1111111111"]}
