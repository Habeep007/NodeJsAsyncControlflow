const http = require('http');
const url = require('url');
const https = require('https');
const async = require('async');

function handleGetRequest(req, res) {
    const queryObject = url.parse(req.url, true).query;
    const addresses = Array.isArray(queryObject.address) ? queryObject.address : [queryObject.address];

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');

    async.each(addresses, (address, callback) => {
        let addressUrl;
        if (!address.startsWith('http://') && !address.startsWith('https://')) {
            addressUrl = 'https://' + address;
        } else {
            addressUrl = address;
        }

        const protocol = addressUrl.startsWith('https') ? https : http;
        protocol.get(addressUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (fetchRes) => {
            if (fetchRes.statusCode >= 300 && fetchRes.statusCode < 400 && fetchRes.headers.location) {
                // Handle redirection
                const redirectUrl = fetchRes.headers.location;
                console.log(redirectUrl)
                // Fetch the final URL
                protocol.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (finalRes) => {
                    let data = '';
                    finalRes.on('data', (chunk) => {
                        data += chunk;
                    });
                    finalRes.on('end', () => {
                        const titleMatch = data.match(/<title>(.*?)<\/title>/);
                        const title = titleMatch ? titleMatch[1] : 'NO RESPONSE';
                        res.write(`<li>${address} - "${title}"</li>`);
                        callback();
                    });
                }).on('error', (error) => {
                    res.write(`<li>${address} - ${'NO RESPONSE'}</li>`);
                    callback();
                });
            } else {
                let data = '';
                fetchRes.on('data', (chunk) => {
                    data += chunk;
                });
                fetchRes.on('end', () => {
                    const titleMatch = data.match(/<title>(.*?)<\/title>/);
                    const title = titleMatch ? titleMatch[1] : 'NO RESPONSE';
                    res.write(`<li>${address} - "${title}"</li>`);
                    callback();
                });
            }
        }).on('error', (error) => {
            res.write(`<li>${address} - ${'NO RESPONSE'}</li>`);
            callback();
        });
    }, () => {
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
