import { createServer } from 'http';
import Repository from './repository.js';
import { decomposePath } from './decomposePath.js';
import { verify } from 'crypto';

var bookmarksRepository = new Repository("./bookmarks.json");
var categoriesRepository = new Repository("./categories.json");

var repositories = {
    "bookmarks": bookmarksRepository,
    "categories": categoriesRepository
}

var verifyCallbacks = {
    "bookmarks": verifyBookmark,
    "categories": verifyCategory
}

function getPayload(req, res) {
    return new Promise(resolve => {
        let body = [];
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let payload = null;
            if (body.length > 0)
                if (req.headers['content-type'] == "application/json")
                    try { resolve(JSON.parse(body)); }
                    catch (error) { console.log(error); }
            resolve(null);
        });
    })
}

function response(res, status, data = null) {
    if (data != null)
        res.writeHead(status, { 'Content-Type': 'application/json' });
    else
        res.writeHead(status);
    // request not handled
    res.end(data);
    return true;
}

function verifyBookmark(bookmark) {
    if (bookmark === null) {
        return false;
    }
    let b_id = bookmark["Id"];
    let b_name = bookmark["Name"];
    let b_url = bookmark["Url"];
    let b_categoryId = bookmark["CategoryId"]
    return [b_id, b_name, b_url, b_categoryId].every((x) => x !== undefined) && categoriesRepository.get(b_categoryId) !== null;
}

function verifyCategory(category) {
    if (category === null) {
        return false;
    }
    let c_id = category["Id"];
    let c_name = category["Name"];
    return [c_id, c_name].every((x) => x !== undefined);
}

async function handleCRUDRequest(req, res, id, params, repo, verifyDataCb) {
    let obj;

    switch (req.method) {
        case "GET":
            if (id === undefined || id === NaN) {
                let bookmarks = repo.getAll();
                if (params !== null && params.categoryId !== undefined) {
                    bookmarks = bookmarks.filter((x) => x.CategoryId == params.categoryId);
                }
                return response(res, 200, JSON.stringify(bookmarks));
            }
            obj = repo.get(id);
            if (obj !== null)
                return response(res, 200, JSON.stringify(obj));
            else
                return response(res, 404);

        case "POST":
            obj = await getPayload(req);
            
            if (verifyDataCb !== undefined) {
                if (!verifyDataCb(obj)) {
                    return response(res, 400);
                }
            }

            obj = repo.add(obj);
            return response(res, 201, JSON.stringify(obj));

        case "PUT":
            obj = await getPayload(req, res);
            
            if (verifyDataCb !== undefined) {
                if (!verifyDataCb(obj)) {
                    return response(res, 400);
                }
            }

            if (repo.update(obj))
                return response(res, 204);
            else
                return response(res, 404);

        case "DELETE":
            if (id === undefined) {
                return response(res, 400);
            }
            if (repo.remove(id))
                return response(res, 202);
            else
                return response(res, 404);
    }
}

async function handleAPIRequest(req, res) {
    let { isAPI, model, controller, action, id, queryString, params } = decomposePath(req.url);

    if (!isAPI)
        return response(res, 404);

    let repo = repositories[model];
    let verifyDataCb = verifyCallbacks[model];
    
    if (repo === undefined)
        return response(res, 404);

    return handleCRUDRequest(req, res, id, params, repo, verifyDataCb);
}

function allowAllAnonymousAccess(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
}
function accessControlConfig(req, res) {
    if (req.headers['sec-fetch-mode'] == 'cors')
        allowAllAnonymousAccess(res);
}
function CORS_Preflight(req, res) {
    if (req.method === 'OPTIONS') {
        console.log('CORS preflight verifications');
        res.end();
        return true;
    }
}
const server = createServer((req, res) => {
    console.log(req.method);
    accessControlConfig(req, res);
    if (!CORS_Preflight(req, res))
        handleAPIRequest(req, res)
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
