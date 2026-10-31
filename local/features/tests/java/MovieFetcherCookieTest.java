package tests;

import dareka.processor.HttpRequestHeader;
import dareka.processor.Resource;
import dareka.processor.StringResource;
import extensions.FilterMatomeSmartFetcher;
import extensions.nlMovieFetcher;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public final class MovieFetcherCookieTest {
    private static final String MOVIE =
            "https://www.nicovideo.jp/local/filter-matome/movie-fetcher/start";
    private static final String SMART =
            "https://www.nicovideo.jp/local/filter-matome/smart-fetcher/credentials";

    private static final class FakeConnection extends HttpURLConnection {
        private final Map<String, List<String>> headers;
        FakeConnection(Map<String, List<String>> headers) throws Exception {
            super(new URL("https://nvapi.nicovideo.jp/"));
            this.headers = headers;
        }
        @Override public Map<String, List<String>> getHeaderFields() { return headers; }
        @Override public void disconnect() {}
        @Override public boolean usingProxy() { return false; }
        @Override public void connect() {}
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static HttpRequestHeader request(String method, String url, String origin,
            String marker, String cookie) throws Exception {
        return new HttpRequestHeader(method + " " + url + " HTTP/1.1\r\n"
                + "Host: www.nicovideo.jp\r\n"
                + (origin == null ? "" : "Origin: " + origin + "\r\n")
                + (marker == null ? "" : marker + ": 1\r\n")
                + (cookie == null ? "" : "Cookie: " + cookie + "\r\n")
                + "Content-Length: 0\r\n\r\n");
    }

    private static String status(Resource resource) throws Exception {
        Field field = StringResource.class.getDeclaredField("statusline");
        field.setAccessible(true);
        return (String) field.get(resource);
    }

    private static String body(Resource resource) throws Exception {
        Field field = StringResource.class.getDeclaredField("contentAsBytes");
        field.setAccessible(true);
        return new String((byte[]) field.get(resource), StandardCharsets.UTF_8);
    }

    private static String issuedCookie(String header) throws Exception {
        Method method = nlMovieFetcher.class.getDeclaredMethod(
                "issuedDeliveryCookie", HttpURLConnection.class);
        method.setAccessible(true);
        try {
            return (String) method.invoke(null,
                    new FakeConnection(Map.of("Set-Cookie", List.of(header))));
        } catch (InvocationTargetException exception) {
            if (exception.getCause() instanceof IOException) throw (IOException) exception.getCause();
            throw exception;
        }
    }

    public static void main(String[] args) throws Exception {
        nlMovieFetcher movie = new nlMovieFetcher();
        FilterMatomeSmartFetcher smart = new FilterMatomeSmartFetcher();
        String origin = "https://www.nicovideo.jp";
        String movieMarker = "X-Filter-Matome-Movie-Fetcher";
        String smartMarker = "X-Filter-Matome-Smart-Fetcher";
        check(movie.getSupportedURLAsPattern().matcher(MOVIE).matches(), "movie bridge route");
        check(!movie.getSupportedURLAsPattern().matcher(MOVIE + "?other=1").matches(), "movie query rejected");
        check(!movie.getSupportedURLAsPattern().matcher(MOVIE.replace("https:", "http:")).matches(), "HTTP rejected");
        check(status(movie.onRequest(request("POST", MOVIE, "https://attacker.invalid", movieMarker, null), null)).contains("404"), "movie origin rejected");
        check(status(movie.onRequest(request("POST", MOVIE, origin, null, null), null)).contains("404"), "movie marker required");
        check(status(movie.onRequest(request("GET", MOVIE, origin, movieMarker, null), null)).contains("405"), "movie method restricted");
        check(status(movie.onRequest(request("POST", MOVIE, origin, movieMarker, null), null)).contains("400"), "movie body validated");

        Path credentials = Path.of(System.getProperty("nicocache.userDataRoot"),
                "data", "filter-matome-smart-fetcher.credentials.json");
        check(status(smart.onRequest(request("POST", SMART, "https://attacker.invalid", smartMarker,
                "user_session=synthetic-session"), null)).contains("404"), "smart origin rejected");
        check(!Files.exists(credentials), "rejected request does not store credentials");
        Resource accepted = smart.onRequest(request("POST", SMART, origin, smartMarker,
                "user_session=synthetic-session; unrelated=synthetic-other"), null);
        check(status(accepted).contains("200"), "smart credential bridge accepted");
        check(body(accepted).contains("\"stored\":true"), "credential state stored");
        check(!body(accepted).contains("synthetic-session"), "response does not disclose cookie");
        check(Files.exists(credentials) && !Files.readString(credentials).contains("synthetic-session"),
                "credential file is encrypted");

        check("domand_bid=synthetic-delivery".equals(issuedCookie(
                "domand_bid=synthetic-delivery; Domain=.nicovideo.jp; Path=/; Secure; HttpOnly")),
                "new delivery cookie accepted");
        check(issuedCookie("other=synthetic; Domain=.nicovideo.jp; Path=/") == null,
                "unrelated cookie ignored");
        try {
            issuedCookie("domand_bid=synthetic; Domain=attacker.invalid; Path=/");
            throw new AssertionError("invalid domain accepted");
        } catch (IOException expected) {
            check(!expected.getMessage().contains("synthetic"), "error does not disclose cookie");
        }
        System.out.println("Java cookie bridge and credential tests passed");
    }
}
