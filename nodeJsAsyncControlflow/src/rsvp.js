const http = require('http');
const url = require('url');
const https = require('https');
const RSVP = require('rsvp');

function fetchTitle(address) {
    return new RSVP.Promise((resolve, reject) => {
        let addressUrl;
        if (!address.startsWith('http://') && !address.startsWith('https://')) {
            addressUrl = 'https://' + address;
        } else {
            addressUrl = address;
        }

        const protocol = addressUrl.startsWith('https') ? https : http;

    
        protocol.get(addressUrl,  (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = res.headers.location;
                protocol.get(redirectUrl, (finalRes) => {
                    let data = '';
                    finalRes.on('data', (chunk) => {
                        data += chunk;
                    });
                    finalRes.on('end', () => {
                        const titleMatch = data.match(/<title>(.*?)<\/title>/);
                        const title = titleMatch ? titleMatch[1] : 'NO RESPONSE';
                        resolve({ address, title });
                    });
                }).on('error', (error) => {
                    reject({ message: 'NO RESPONSE', address: redirectUrl });
                });
            } else {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const titleMatch = data.match(/<title>(.*?)<\/title>/);
                    const title = titleMatch ? titleMatch[1] : 'NO RESPONSE';
                    resolve({ address, title });
                });
            }
        })
            .on('error', (error) => {
                reject({ message: 'NO RESPONSE', address });
            });
    });
}

function handleGetRequest(req, res) {
    const queryObject = url.parse(req.url, true).query;
    const addresses = Array.isArray(queryObject.address) ? queryObject.address : [queryObject.address];

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');

    const fetchPromises = addresses.map(address => fetchTitle(address));
    RSVP.allSettled(fetchPromises)
        .then(results => {
            results.forEach(result => {
                if (result.state === 'fulfilled') {
                    const { address, title } = result.value;
                    res.write(`<li>${address} - "${title}"</li>`);
                } else {
                    const { address, message } = result.reason;
                    res.write(`<li>${address} - ${message}</li>`);
                }
            });
            res.end('</ul></body></html>');
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
