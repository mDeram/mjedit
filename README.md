# mjedit

```js
const Mjedit = require('mjedit');
const mjedit = new Mjedit(
    'hello_mjedit',
    {
        idValid: {
            value: false,
            text: 'Are ids valid? (true/false)',
            validator: (value) => ['true', 'false'].includes(value),
        },
        ids: {
            value: [],
            text: 'Enter ids (csv)',
            validator: (ids) => ids.every(id => id.length === 10),
            parser: (answer) => answer.split(',').map(id => id.trim())
        }
    }
);

mjedit.run();
```

```sh
$ node app.js
No existing metadata file found for hello_mjedit.json
Are ids valid? (true/false): true
Enter ids (csv): 1234567890, 12345		# the second id is invalid
Enter ids (csv): 1234567890, 1234554321
$ cat hello_mjedit.json
{"idValid":"true","ids":["1234567890","1234554321"]}
$ node app.js
Are ids valid? (true/false): 
Enter ids (csv): 1111111111
$ cat hello_mjedit.json
{"idValid":"true","ids":["1111111111"]}
```
