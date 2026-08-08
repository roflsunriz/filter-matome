/**
 * ExtUtil: Extensionを作る上で役立ちそうな定型処理をまとめたユーティリティクラス
 * 
 * このファイルを他のExtensionに同梱しても構いませんが、改変はしないでください。
 */
package extensions;

import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.Charset;
import java.util.Calendar;
import java.util.Map;
import java.util.Vector;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.NLMain;
import dareka.common.CloseUtil;
import dareka.common.LoggerHandler;
import dareka.common.Pair;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.HttpResponseHeader;
import dareka.processor.StringResource;
import dareka.processor.URLResource;
import dareka.processor.impl.EasyRewriter;

// 更新履歴:
//
// 100905 初版(テスト版との互換性はありません)
// 100909 getInteger()を追加
// 101028 matchNGtitle()が部分一致しなかった不具合を修正
// 110110 isNGvideoId()を追加、NG系をEasyRewriter.LSTを使うように変更
// 110125 ログ出力周りを+110125modの拡張ロガーを使うように変更
//
public class ExtUtil extends Thread implements Extension2, Runnable {
	
	/** ExtUtilのリビジョンを判定する場合はこの値を参照する */
	public static final int REVISION = 110125;
	public static final String VER_STRING = "ExtUtil_" + REVISION;
	
	private static final Pattern URL_HOST_PATTERN = Pattern.compile("https?://([^/]+)");
	private static final Pattern MIME_CHARSET_PATTERN = Pattern.compile("charset=([^;]+)");
	private static final Charset FILE_CHARSET = Charset.forName("UTF-8");
	
	private static final Class<?>[] loadMethodTypes = new Class<?>[]{ BufferedReader.class };
	private static final Class<?>[] saveMethodTypes = new Class<?>[]{ BufferedWriter.class };
	
	private static final Vector<ExtUtil> extensions = new Vector<ExtUtil>();
	private static ScheduledExecutorService sched;
	private static ExtUtil self, onMinutesInstance, onShutdownInstance;
	
	private Extension2 caller;
	private String propDebug;
	private LoggerHandler extLogger;
	private String methodName;
	private Object[] params;
	
	public ExtUtil() {
		if (sched == null) {
			sched = Executors.newSingleThreadScheduledExecutor();
			sched.scheduleAtFixedRate(
					onMinutesInstance  = new ExtUtil(), 60, 60, TimeUnit.SECONDS);
			Runtime.getRuntime().addShutdownHook(
					onShutdownInstance = new ExtUtil());
			register(self = this, "ExtUtil", null);
			self.debug("setting up now.");
		}
	}
	
	// 内部用に個々の状態を保持するインスタンスを生成する
	private ExtUtil(Extension2 caller, String methodName, Object param) {
		this.caller = caller;
		this.methodName = methodName;
		if (param != null) {
			this.params = new Object[]{ param };
		}
	}
	
	// Extension2 interface
	public void registerExtensions(ExtensionManager mgr) {
		// Extensionとしては何もしない
	}
	
	public String getVersionString() {
		return VER_STRING;
	}
	
	// Runnable interface
	public void run() {
		if (caller != null) {
			Class<?>[] types = null;
			if (params != null) {
				types = new Class<?>[]{ params[0].getClass() };
			}
			callMethod(null, caller, methodName, types, params);
		} else if (this == onMinutesInstance) {
			for (ExtUtil util : extensions) {
				callMethod(null, util.caller, "onMinutes", null);
			}
		} else if (this == onShutdownInstance) {
			for (ExtUtil util : extensions) {
				callMethod(null, util.caller, "onShutdown", null);
			}
		}
	}
	
	/**
	 * ExtUtilのインスタンスを生成する
	 * <p>
	 * 呼び出し元の情報を必要とするAPIはインスタンスメソッドとして実装している。
	 * そのため、それらのAPIを利用するには、インスタンスを生成して呼び出し元の
	 * ExtensionをExtUtilに登録する必要がある。
	 * また、呼び出し元のExtensionで以下のメソッドを定義することで、イベント毎に
	 * ExtUtilからコールバックを受け取ることができる。
	 * <pre>
	 * public void onMinutes():
	 *   1分間隔で呼び出される。シングルスレッドで登録されたExtensionを
	 *   順番に呼び出すので、必ずしも等間隔で呼び出されるわけではない。
	 * public void onShutdown():
	 *   shutdown時に呼び出される。保存等の終了処理を行う事ができる。
	 *   
	 * reflact APIを使って動的にメソッドを検索するので、interfaceのように
	 * 必ずメソッドを定義する必要は無い(使わないものは定義しなくて良い)。</pre>
	 * 
	 * @param extension 登録するExtensionのインスタンス
	 * @param prefix    ログを表示する時のプレフィックス文字列(nullなら呼び出し元クラス名)
	 * @param propDebug デバッグモード状態を取得するプロパティ文字列(nullなら<b>prefix</b>+"Debug")
	 * @throws IllegalArgumentException extensionがnullの場合
	 */
	public ExtUtil(Extension2 extension, String prefix, String propDebug) {
		if (extension == null) {
			throw new IllegalArgumentException("extension must not be null.");
		}
		register(extension, prefix, propDebug);
	}
	
	private void register(Extension2 caller, String prefix, String propDebug) {
		if (prefix == null) {
			prefix = caller.getClass().getName().substring("extensions.".length());
		}
		if (propDebug == null) {
			propDebug = prefix.concat("Debug");
		}
		this.caller = caller;
		this.propDebug = propDebug;
		extLogger = NLMain.getExtLogger(caller, prefix, propDebug, false);
		extensions.add(this);
	}
	
	/**
	 * 情報ログを出力する
	 * 
	 * @param message ログ文字列
	 */
	public void info(String message) {
		extLogger.info(message);
	}
	
	/**
	 * 情報ログをフォーマットして出力する
	 * 
	 * @param format フォーマット文字列
	 * @param args フォーマットパラメータ
	 */
	public void info(String format, Object...args) {
		extLogger.info(format, args);
	}
	
	
	/**
	 * 警告ログを出力する
	 * 
	 * @param message ログ文字列
	 */
	public void warn(String message) {
		extLogger.warning(message);
	}
	
	/**
	 * 警告ログをフォーマットして出力する
	 * 
	 * @param format フォーマット文字列
	 * @param args フォーマットパラメータ
	 */
	public void warn(String format, Object...args) {
		extLogger.warning(String.format(format, args));
	}
	
	/**
	 * デバッグモードか？
	 * 
	 * @return デバッグモードならtrue
	 */
	public boolean isDebug() {
		return Boolean.getBoolean(propDebug);
	}
	
	/**
	 * デバッグログを出力する
	 * 
	 * @param message ログ文字列
	 */
	@Deprecated
	public void _DBG(String message) {
		extLogger.debug(message);
	}
	
	/**
	 * デバッグモードならデバッグログをフォーマットして出力する
	 * 
	 * @param format フォーマット文字列
	 * @param args フォーマットパラメータ
	 */
	public void debug(String format, Object...args) {
		if (isDebug()) extLogger.debug(String.format(format, args));
	}
	
	/**
	 * スレッドを生成して指定メソッドを呼び出す
	 * 
	 * @param methodName 呼び出すメソッド名文字列(引数無し)
	 */
	public void execute(String methodName) {
		execute(methodName, null);
	}
	
	/**
	 * スレッドを生成して指定メソッドを引数付きで呼び出す
	 * 
	 * @param methodName 呼び出すメソッド名文字列(引数T)
	 * @param param 指定メソッドに渡す引数
	 */
	public <T> void execute(String methodName, T param) {
		(new ExtUtil(caller, methodName, param)).start();
	}
	
	/**
	 * 遅延時間後に指定メソッドを呼び出す
	 * 
	 * @param methodName 呼び出すメソッド名文字列(引数無し)
	 * @param delay 遅延時間(ミリ秒)
	 */
	public void setSchedule(String methodName, long delay) {
		sched.schedule(new ExtUtil(caller, methodName, null), delay, TimeUnit.MILLISECONDS);
	}
	
	/**
	 * 遅延時間後に指定メソッドを引数付きで呼び出す
	 * 
	 * @param methodName 呼び出すメソッド名文字列(引数T)
	 * @param param 指定メソッドに渡す引数
	 * @param delay 遅延時間(ミリ秒)
	 */
	public <T> void setSchedule(String methodName, T param, long delay) {
		sched.schedule(new ExtUtil(caller, methodName, param), delay, TimeUnit.MILLISECONDS);
	}
	
	/**
	 * レスポンス用にキャッシュされない文字列リソースを返す
	 * 
	 * @param text レスポンス文字列
	 * @param contentType コンテントタイプ(省略時は"text/plain")
	 * @return 文字列リソース
	 */
	public static StringResource responseText(String text, String contentType) {
		StringResource r = new StringResource(text);
		if (contentType != null) {
			r.setResponseHeader(HttpHeader.CONTENT_TYPE, contentType);
		}
		r.addNoCacheResponseHeaders();
		return r;
	}
	
	/**
	 * contentType = text/plain
	 * @see #responseText(String, String)
	 */
	public static StringResource responseText(String text) {
		return responseText(text, "text/plain");
	}
	
	/**
	 * キャッシュフォルダ以下にあるファイルオブジェクトを返す
	 * 
	 * @param path キャッシュフォルダ以下の相対パス
	 * @return ファイルオブジェクト
	 */
	public static File cacheFolderFile(String path) {
		String cacheFolder = System.getProperty("cacheFolder", "");
		if (cacheFolder.length() > 0) {
			cacheFolder = cacheFolder.replace(
					File.separatorChar, '/').replaceFirst("/$", "");
		} else {
			cacheFolder = "cache";
		}
		return new File(cacheFolder + "/" + path);
	}
	
	/**
	 * システムプロパティの整数値を最小値・最大値の制限付きで取得する
	 * 
	 * @param name 取得するプロパティ名
	 * @param def デフォルト値(最小値・最大値の範囲内であること)
	 * @param min 最小値
	 * @param max 最大値
	 * @return 取得したシステムプロパティの整数値
	 */
	public static int getInteger(String name, int def, int min, int max) {
		int value = def;
		String property = System.getProperty(name);
		try {
			if (property != null) value = Integer.parseInt(property);
		} catch (NumberFormatException e) {
			self.debug("property '%s' is not a integer.", property);
		}
		return (value < min) ? min : (value > max) ? max : value;
	}
	
	/**
	 * max = Integer.MAX_VALUE
	 * @see #getInteger(String, int, int, int)
	 */
	public static int getInteger(String name, int def, int min) {
		return getInteger(name, def, min, Integer.MAX_VALUE);
	}
	
	/**
	 * リクエストヘッダにURLを設定する。Hostヘッダも設定する。
	 * また、メソッドをGETに設定、Content-Typeヘッダは削除する。
	 * 
	 * @param requestHeader 設定対象のリクエストヘッダ
	 * @param url 設定するURL
	 * @param setReferer trueならrequestHeader.getURI()の内容をRefererに設定する。
	 *                   falseならRefererをクリアする
	 * @return URLを設定したリクエストヘッダ
	 */
	public static HttpRequestHeader setURL(
			HttpRequestHeader requestHeader, String url, boolean setReferer) {
		if (requestHeader != null) {
			if (setReferer) {
				requestHeader.setMessageHeader("Referer", requestHeader.getURI());
			} else {
				requestHeader.removeMessageHeader("Referer");
			}
			requestHeader.setMethod("GET");
			requestHeader.setURI(url);
			Matcher m = URL_HOST_PATTERN.matcher(url);
			if (m.find()) {
				requestHeader.setMessageHeader("Host", m.group(1));
			}
			requestHeader.removeMessageHeader(HttpHeader.CONTENT_TYPE);
		}
		return requestHeader;
	}
	
	/**
	 * レスポンスヘッダのContent-Typeから文字セットを取得する
	 * 
	 * @param responseHeader 取得対象のレスポンスヘッダ
	 * @return 取得した文字セット、取得できない場合はUTF-8を返す
	 */
	public static String getCharset(HttpResponseHeader responseHeader) {
		String charset = "UTF-8";
		String contentType = responseHeader.getMessageHeader(HttpHeader.CONTENT_TYPE);
		if (contentType != null) {
			Matcher m = MIME_CHARSET_PATTERN.matcher(contentType);
			if (m.matches()) charset = m.group(1).trim();
		}
		return charset;
	}
	
	/**
	 * リクエストヘッダを元にHTTPアクセスして結果を文字列にして返す簡易メソッド
	 * <p>
	 * このメソッドを使うには、最低限リクエストヘッダにアクセス先URLを設定する。
	 * 必要に応じて"Host","Accept-Ancoding","Content-Type"といったヘッダが設定される。
	 * POSTの場合はContent-Typeに"application/x-www-form-urlencoded"を設定する。
	 * 
	 * @param requestHeader リクエストヘッダ
	 * @param postString GETの場合はnull、POSTの場合はPOSTする文字列を指定する
	 * @return レスポンスボディ文字列、ステータスが200以外の場合はnull
	 */
	public static String http_get(HttpRequestHeader requestHeader, String postString) {
		String url = requestHeader.getURI();
		Matcher m = URL_HOST_PATTERN.matcher(url);
		if (m.matches()) {
			requestHeader.setMessageHeader("Host", m.group(1));
		}
		InputStream bin = null;
		if (postString == null) {
			requestHeader.setMethod("GET");
			requestHeader.removeMessageHeader(HttpHeader.CONTENT_TYPE);
		} else {
			bin = new ByteArrayInputStream(postString.getBytes());
			requestHeader.setMethod("POST");
			requestHeader.setMessageHeader(
					HttpHeader.CONTENT_TYPE, "application/x-www-form-urlencoded");
		}
		HttpResponseHeader responseHeader = null;
		try {
			URLResource r = new URLResource(requestHeader.getURI());
			r.setFollowRedirects(true);
			// NicoCacheがサポートしているエンコーディングのみ設定
			requestHeader.setMessageHeader("Accept-Encoding", "gzip, deflate");
			responseHeader = r.getResponseHeader(bin, requestHeader);
			if (responseHeader != null && responseHeader.getStatusCode() == 200) {
				byte[] body = r.getResponseBody();
				if (body != null) return new String(body, getCharset(responseHeader));
			}
		} catch (IOException e) {
			if (self.isDebug()) {
				self.extLogger.error(e);
				self._DBG("requestHeader:\n" + requestHeader);
				if (responseHeader != null) {
					self._DBG("responseHeader:\n" + responseHeader);
				}
			}
			self.warn(requestHeader.getMethod()+" "+url+" failed.");
		}
		return null; // FAILURE
	}
	
	/**
	 * postString = null
	 * @see #http_get(HttpRequestHeader, String)
	 */
	public static String http_get(HttpRequestHeader requestHeader) {
		return http_get(requestHeader, null);
	}
	
	/**
	 * クラスの引数無しstaticメソッドを動的に呼び出して結果を返す
	 * 
	 * @param className 呼び出すクラス名。Extensionの場合は"extensions.～"
	 * @param methodName 呼び出すメソッド名
	 * @return 呼び出した結果を格納するオブジェクト、失敗した場合はnull
	 */
	public static Object callMethod(String className, String methodName) {
		try {
			Class<?> k = Class.forName(className);
			return callMethod(k, null, methodName, null);
		} catch (ClassNotFoundException e) {
			self.debug("class '%s' not found.", className);
		}
		return null; // FAILURE
	}
	
	/**
	 * クラスのメソッドを動的に呼び出して結果を返す
	 * 
	 * @param k 呼び出すクラスのClassオブジェクト、nullを指定した場合はinstanceから取得する
	 * @param instance 呼び出すオブジェクトのインスタンス、staticメソッドの場合はnull
	 * @param methodName 呼び出すメソッド名
	 * @param parameterTypes 呼び出すメソッドの引数型の配列、引数無しの場合はnull
	 * @param parameters 呼び出すメソッドの引数の配列、引数無しの場合はnull
	 * @return 呼び出した結果を格納するオブジェクト、失敗した場合はnull
	 */
	public static Object callMethod(Class<?> k, Object instance,
			String methodName, Class<?>[] parameterTypes, Object...parameters) {
		assert k != null || instance != null;
		try {
			if (k == null && instance != null)
				k = instance.getClass();
			Method m = k.getMethod(methodName, parameterTypes);
			Object result = m.invoke(instance, parameters);
			self.debug("%s%c%s() called, instance=%s, result=%s.", k.getName(),
					instance != null ? '#' : '.', methodName, instance, result);
			return result;
		} catch (NoSuchMethodException e) {
			self.debug("%s#%s() not found.", k.getName(), methodName);
		} catch (IllegalAccessException e) {
			if (self.isDebug()) self.extLogger.error(e);
		} catch (SecurityException e) {
			if (self.isDebug()) self.extLogger.error(e);
		} catch (InvocationTargetException e) {
			if (self.isDebug()) self.extLogger.error(e);
		}
		return null; // FAILURE
	}
	
	/**
	 * ファイルが更新されていれば読み込みメソッドを呼び出す
	 * <p>
	 * fileInfoに読み込みたいファイルの情報をPair<File, Long>で与える。
	 * File値は読み込みたいファイルのFileオブジェクト、Long値はファイルの
	 * 最終更新日時を設定する(最初に必ず読み込みたいなら0Lを設定)。
	 * ファイルが存在する場合、Long値はファイルの最終更新日時で上書きされる。
	 * ファイルが存在しない場合、Long値は1Lで上書きされる。
	 * また、fileInfoは排他制御のためのロックオブジェクトとしても用いられるので、
	 * 可能な限りstatic finalオブジェクトとして定義するのが望ましい。
	 * <p>
	 * loadMethodは以下の形式で呼び出すメソッドを定義する。
	 * <pre>
	 * public void loadMethod(BufferedReader br) throws IOException</pre>
	 * <p>
	 * brには、ファイルが存在する場合はBufferedReaderのインスタンスが与えられるが、
	 * ファイルが存在しない場合はnullが与えられる。よって、brがnull以外の場合は
	 * ファイルからコレクションに値を読み込み、brがnullの場合はコレクションを
	 * クリアする、といった使い方ができる。
	 * <p>
	 * 本メソッドの使用例は{@link #matchNGtitle(String)}を参照のこと。
	 * 
	 * @param fileInfo ファイル情報をPair<File, Long>で与える
	 * @param loadMethod 実際にファイルを読み込むメソッド名
	 * @param charset ファイルから読み込む際の文字セット(省略時は"UTF-8")
	 * @return loadMethodを呼び出したならtrue
	 */
	public boolean loadFile(Pair<File, Long> fileInfo, String loadMethod, Charset charset) {
		BufferedReader br = null;
		long lastmod = fileInfo.first.lastModified();
		if (fileInfo.second < lastmod) {
			fileInfo.second = lastmod;
			synchronized (fileInfo) {
				debug("loading '%s'...", fileInfo.first);
				try {
					br = new BufferedReader(new InputStreamReader(
							new FileInputStream(fileInfo.first), charset));
					callMethod(null, caller, loadMethod, loadMethodTypes, br);
					return true;
				} catch (IOException e) {
					extLogger.error(e);
					warn("loading '%s' failed.", fileInfo.first);
				} finally {
					CloseUtil.close(br);
				}
			}
		} else if (lastmod == 0L && !fileInfo.first.exists()) {
			if (fileInfo.second != 1L) {
				fileInfo.second  = 1L;
				synchronized (fileInfo) {
					debug("loading '%s' is none.", fileInfo.first);
					callMethod(null, caller, loadMethod, loadMethodTypes, br);
					return true;
				}
			}
		}
		return false;
	}
	
	/**
	 * charset = UTF-8
	 * @see #loadFile(Pair, String, Charset)
	 */
	public boolean loadFile(Pair<File, Long> fileInfo, String loadMethod) {
		return loadFile(fileInfo, loadMethod, FILE_CHARSET);
	}
	
	/**
	 * 書き出しメソッドを呼び出してファイルを更新する
	 * <p>
	 * fileInfoで与えられるファイルの内容を更新して、更新日時を上書きする。
	 * 書き出すファイルはデイリーでバックアップを作成する。
	 * <p>
	 * saveMethodは以下の形式で呼び出すメソッドを定義する。
	 * <pre>
	 * public void saveMethod(BufferedWriter bw) throws IOException</pre>
	 * <p>
	 * bwには、必ずBufferedWriterのインスタンスが与えられる。
	 * loadMethodと異なり、bwにnullが与えられることは無い。
	 * 
	 * @see #loadFile(Pair, String, Charset)
	 * @param fileInfo ファイル情報をPair<File, Long>で与える
	 * @param saveMethod 実際にファイルに書き出すメソッド名
	 * @param direct この値がtrueなら、saveMethodの文字列を直接書き出す
	 * @param charset ファイルに書き出す際の文字セット(省略時は"UTF-8")
	 * @return ファイルの書き出しに成功したならtrue
	 * 
	 */
	public boolean saveFile(Pair<File, Long> fileInfo,
			String saveMethod, boolean direct, Charset charset) {
		boolean saved = false;
		synchronized (fileInfo) {
			renameToBak(fileInfo.first, true);
			debug("saving '%s'...", fileInfo.first);
			BufferedWriter bw = null;
			try {
				bw = new BufferedWriter(new OutputStreamWriter(
						new FileOutputStream(fileInfo.first), charset));
				if (direct) {
					bw.write(saveMethod);
				} else {
					callMethod(null, caller, saveMethod, saveMethodTypes, bw);
				}
				saved = true;
			} catch (IOException e) {
				extLogger.error(e);
				warn("saving '%s' failed.", fileInfo.first);
			} finally {
				CloseUtil.close(bw);
				if (saved) fileInfo.second = fileInfo.first.lastModified();
			}
		}
		return saved;
	}
	
	/**
	 * charset = UTF-8
	 * @see #saveFile(Pair, String, boolean, Charset)
	 */
	public boolean saveFile(Pair<File, Long> fileInfo, String saveMethod, boolean direct) {
		return saveFile(fileInfo, saveMethod, direct, FILE_CHARSET);
	}
	
	/**
	 * direct = false, charset = UTF-8
	 * @see #saveFile(Pair, String, boolean, Charset)
	 */
	public boolean saveFile(Pair<File, Long> fileInfo, String saveMethod) {
		return saveFile(fileInfo, saveMethod, false, FILE_CHARSET);
	}
	
	/**
	 * 動画が過去に削除されたことがあるか？
	 * <ul>
	 * <li>totalRenameの削除履歴情報に含まれているか？
	 * </ul>
	 * @param smid 動画ID
	 * @return 過去に削除されたことがあればtrue
	 */
	@SuppressWarnings("unchecked")
	public static boolean hasRemoved(String smid) {
		Map<String, String> info = (Map<String, String>)callMethod(
				"extensions.totalRenameHelper", "getRemoveInfo");
		return info != null ? info.containsKey(smid) : false;
	}
	
	/**
	 * NGタイトルを確認する
	 * <ul>
	 * <li>list/OKvideoId.txtに含まれていない(smidが指定されている場合)
	 * <li>list/NGtitle.txtに含まれているか？
	 * </ul>
	 * @param title タイトル文字列
	 * @param smid 動画ID、必要なければnull
	 * @return NGタイトルにマッチすればMatcherを、マッチしなければnullを返す
	 */
	public static Matcher matchNGtitle(String title, String smid) {
		Pattern pattern;
		if (smid != null) {
			pattern = EasyRewriter.LST.getPattern("list/OKvideoId.txt");
			if (pattern.matcher(smid).matches()) {
				return null;
			}
		}
		pattern = EasyRewriter.LST.getPattern("list/NGtitle.txt");
		Matcher m = pattern.matcher(title);
		return m.find() ? m : null;
	}
	
	/**
	 * smid = null
	 * @see #matchNGtitle(String, String)
	 */
	public static Matcher matchNGtitle(String title) {
		return matchNGtitle(title, null);
	}
	
	/**
	 * NGユーザーか？
	 * <ul>
	 * <li>list/NGuserId.txtに含まれているか？
	 * </ul>
	 * @param userId ユーザーID
	 * @return NGユーザーならtrue
	 */
	public static boolean isNGuserId(String userId) {
		Pattern pattern = EasyRewriter.LST.getPattern("list/NGuserId.txt");
		return pattern.matcher(userId).matches();
	}
	
	/**
	 * @see #isNGuserId(String)
	 */
	public static boolean isNGuserId(Integer userId) {
		return isNGuserId(userId.toString());
	}
	
	/**
	 * NG動画IDか？
	 * <ul>
	 * <li>list/NGvideoId.txtに含まれているか？
	 * </ul>
	 * @param videoId 動画ID
	 * @return NG動画IDならtrue
	 */
	public static boolean isNGvideoId(String videoId) {
		Pattern pattern = EasyRewriter.LST.getPattern("list/NGvideoId.txt");
		return pattern.matcher(videoId).matches();
	}
	
	/**
	 * 指定ファイルをバックアップファイルにリネームする
	 * 
	 * @param file リネーム対象のファイル(ファイル名+".bak"になる)
	 * @param daily trueなら日付が変わる毎に、false(省略時)なら常にバックアップを作成する
	 * @return リネームしたらtrue
	 */
	public static boolean renameToBak(File file, boolean daily) {
		if (file.exists()) {
			File file_bak = new File(file.getPath().concat(".bak"));
			if (file_bak.exists()) {
				if (daily) {
					int y1, d1, y2, d2;
					Calendar c = Calendar.getInstance();
					y1 = c.get(Calendar.YEAR);
					d1 = c.get(Calendar.DAY_OF_YEAR);
					c.setTimeInMillis(file_bak.lastModified());
					y2 = c.get(Calendar.YEAR);
					d2 = c.get(Calendar.DAY_OF_YEAR);
					if (y1 == y2 && d1 == d2) return false;
				}
				file_bak.delete();
			}
			self.debug("rename to '%s'.", file_bak);
			return file.renameTo(file_bak);
		} else {
			self.debug("'%s' not exists.", file);
		}
		return false;
	}
	
	/**
	 * daily = false
	 * @see #renameToBak(File, boolean)
	 */
	public static boolean renameToBak(File file) {
		return renameToBak(file, false);
	}
	
}
