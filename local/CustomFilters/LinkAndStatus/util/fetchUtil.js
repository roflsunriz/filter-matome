"use strict";

export const handleFetch = (videoId) => {
  if (!videoId) return;
  if (/\/(series\/|search\/|tag\/).*/.test(window.location.pathname)) {
    fetchAll_origin();
  } else if (/\/user\/.*?/.test(window.location.pathname)) {
    fetchAll_wrapper();
  } else {
    fetch(`https://www.nicovideo.jp/cache/fetch?${videoId}`)
      .then(handleFetchResponse)
      .catch(handleFetchError);
  }
};

export const handleFetchResponse = (response) => {
  if (response.ok) {
    return response.text().then(text => {
      window.alert(`${text + ":" + videoId + NicoCache_nl.watch.apiData.video.title}`);
    });
  } else {
    handleFetchError(response);
  }
};

export const handleFetchError = (response) => {
  const errorcode = "Error: nlMovieFetcher doesn't exist or videoId was null.";
  console.error("HTTP status code : " + response.status);
  console.error("HTTP status Text : " + response.statusText);
  throw new Error(errorcode);
};

export const fetchCacheInfo = (videoId) => {
  return fetch(`https://www.nicovideo.jp/cache/info/v2?${videoId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
};