const http = require('http');
const url = require('url');
const https = require('https');


function fetchTitle(address, callback, redirectCount = 0) {

    let addressUrl;
    if (!address.startsWith('http://') && !address.startsWith('https://')) {
        addressUrl = 'https://' + address;
    } else {
        console.log(addressUrl, address)
        addressUrl = address
    }


    const protocol = addressUrl.startsWith('https') ? https : http;
    protocol.get(addressUrl, (res) => {

        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
         
            if (redirectCount < 2) { 
                fetchTitle(res.headers.location, callback, redirectCount + 1);
            } else {
                callback({ message: 'NO RESPONSE', address });
            }
            return;
        }
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {

            const titleMatch = data.match(/<title>(.*?)<\/title>/);
            const title = titleMatch ? titleMatch[1] : 'NO RESPONSE';
           
            callback(null, { address, title });
        });
    }).on('error', (error) => {
        callback({message:'NO RESPONSE', address})
    });
}

function handleGetRequest(req, res) {
    const queryObject = url.parse(req.url, true).query;
    const addresses = Array.isArray(queryObject.address) ? queryObject.address : [queryObject.address];

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head></head><body><h1>Following are the titles of given websites:</h1><ul>');

    let completedRequests = 0;

    addresses.forEach((address) => {
        fetchTitle(address, (error, result) => {
            if (error) {
                res.write(`<li>${address} - ${error.message}</li>`);
            } else {
                res.write(`<li>${result.address} - "${result.title}"</li>`);
            }

            completedRequests++;

            if (completedRequests === addresses.length) {
                res.end('</ul></body></html>');
            }
        });
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