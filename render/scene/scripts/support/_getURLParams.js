const getURLParams = () => {
    const params = {};
    const url = new URL(window.location.href);
    const paramsString = url.search.slice(1);
    const paramsArray = paramsString.split('&');
    paramsArray.forEach(param => {
      const [key, value] = param.split('=');
      params[key] = value;
    });
    return params;
  };


export default getURLParams;
