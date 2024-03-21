const http = require('http');
const url = require('url');
const https = require('https');
const { from } = require('rxjs');
const { toArray , catchError, mergeMap } = require('rxjs/operators');

function fetchTitle(address) {

    let addressUrl;
    if (!address.startsWith('http://') && !address.startsWith('https://')) {
        addressUrl = 'https://' + address;
    } else {
        addressUrl = address;
    }

    const protocol = addressUrl.startsWith('https') ? https : http;
    console.log(typeof address)
    return from(
        new Promise((resolve, reject) => {
            protocol.get(addressUrl, (res) => {

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    const titleMatch = data.match(/<title>(.*?)<\/title>/);
                    const title = titleMatch ? titleMatch[1] : 'NO RESPONSE';
                    resolve({ address, title });
                });
            }).on('error', (error) => {
                resolve({ address, title: 'NO RESPONSE' });
            });
        })
    );
}

function handleGetRequest(req, res) {
    const queryObject = url.parse(req.url, true).query;
    const addresses = Array.isArray(queryObject.address) ? queryObject.address : [queryObject.address];

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');

    const requests$ = from(addresses).pipe(
        mergeMap((address) => fetchTitle(address)),
        catchError((error) => {
            return { title: 'NO RESPONSE' };
        }),
        toArray() 
    );

    requests$.subscribe({
        next: (results) => {
            results.forEach((result) => {
                res.write(`<li>${result.address} - "${result.title}"</li>`);
            });
        },
        complete: () => {
            res.end('</ul></body></html>');
        },
    });
}


const server = http.createServer((req, res) => {
    if (req.url.startsWith('/I/want/title')) {
        handleGetRequest(req, res);
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
