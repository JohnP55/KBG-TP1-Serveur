import queryStringParser from 'query-string';

function getQueryString(url) {
    if (url.indexOf('?') > -1)
        return url.substring(url.indexOf('?'), url.length);
    return undefined;
}
function removeQueryString(url) {
    let queryStringMarkerPos = url.indexOf('?');
    if (queryStringMarkerPos > -1)
        url = url.substr(0, queryStringMarkerPos);
    return url;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export const decomposePath = (url) => {
    let isAPI = false;
    let model = undefined;
    let controller = undefined;
    let action = undefined;
    let id = undefined;
    let params = null;

    let queryString = getQueryString(url);

    if (queryString != undefined)
        params = queryStringParser.parse(queryString);
    let path = removeQueryString(url).toLowerCase();

    if (path.indexOf('/api') > -1) {
        isAPI = true;
        path = path.replace('/api', '')
    }

    let urlParts = path.split("/");

    if (urlParts[1] != undefined) {
        model = urlParts[1];
        controller = capitalizeFirstLetter(model) + 'Controller';
    }

    if (!isAPI) {
        if (urlParts[2] != undefined && urlParts[2] != '')
            action = urlParts[2];
        else
            action = 'index';
        if (urlParts[3] != undefined && urlParts[3] != '')
            id = parseInt(urlParts[3]);
    } else {
        if (urlParts[2] != undefined && urlParts[2] != '')
            id = parseInt(urlParts[2]);
    }
    return { isAPI, model, controller, action, id, queryString, params };
}