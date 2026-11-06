package com.purefxai.puregold;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name="PgNative")
public class PgPlugin extends Plugin {
  SharedPreferences sp(){return getContext().getSharedPreferences("pg",0);}
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private final AtomicBoolean downloading = new AtomicBoolean(false);
  private final AtomicBoolean cancelDl = new AtomicBoolean(false);
  private volatile long dlDone, dlTotal;

  File modelDir(){
    File d=new File(getContext().getFilesDir(),"models");
    //noinspection ResultOfMethodCallIgnored
    d.mkdirs();
    return d;
  }

  @PluginMethod public void setSettings(PluginCall c){
    SharedPreferences.Editor e=sp().edit();
    e.putBoolean("auto",c.getBoolean("auto",true));
    e.putInt("interval",c.getInt("interval",10));
    e.putBoolean("voice",c.getBoolean("voice",true));
    e.putBoolean("mute",c.getBoolean("mute",false));
    e.putBoolean("alertSR",c.getBoolean("alertSR",true));
    e.putBoolean("alertBias",c.getBoolean("alertBias",true));
    e.putString("lang",c.getString("lang","th"));
    if(c.getData().has("overlay")) e.putBoolean("overlay",c.getBoolean("overlay",false));
    String pa=c.getString("priceAlerts",null);
    if(pa!=null) e.putString("priceAlerts",pa);
    e.apply();
    GoldWorker.schedule(getContext(),true);
    c.resolve();
  }

  @PluginMethod public void getLast(PluginCall c){
    JSObject o=new JSObject();
    o.put("text",sp().getString("lastText",""));
    o.put("at",sp().getLong("lastAt",0));
    o.put("json",sp().getString("lastJson",""));
    c.resolve(o);
  }

  @PluginMethod public void runNow(PluginCall c){
    String custom=c.getString("customText",null);
    if(custom!=null&&!custom.isEmpty()){
      SharedPreferences p=sp();
      p.edit().putString("lastText",custom).putLong("lastAt",System.currentTimeMillis()).apply();
      GoldWorker.alert(getContext(),custom,p);
      c.resolve(); return;
    }
    GoldWorker.runOnce(getContext(),c.getBoolean("force",true)); c.resolve();
  }

  @PluginMethod public void pushSnapshot(PluginCall c){
    SharedPreferences.Editor e=sp().edit();
    Double price=c.getDouble("price",null);
    if(price!=null) e.putFloat("snap_price",price.floatValue());
    e.putString("snap_side",c.getString("side","WAIT"));
    e.putString("snap_bias",c.getString("bias","side"));
    Integer conf=c.getInt("conf",null);
    if(conf!=null) e.putInt("snap_conf",conf);
    Double e0=c.getDouble("entry0",null); if(e0!=null) e.putFloat("snap_entry0",e0.floatValue());
    Double e1=c.getDouble("entry1",null); if(e1!=null) e.putFloat("snap_entry1",e1.floatValue());
    Double sl=c.getDouble("sl",null); if(sl!=null) e.putFloat("snap_sl",sl.floatValue());
    Double tp=c.getDouble("tp",null); if(tp!=null) e.putFloat("snap_tp",tp.floatValue());
    String thaiSell=c.getString("thaiSell",null); if(thaiSell!=null) e.putString("snap_thaiSell",thaiSell);
    String thaiBuy=c.getString("thaiBuy",null); if(thaiBuy!=null) e.putString("snap_thaiBuy",thaiBuy);
    String lang=c.getString("lang",null); if(lang!=null) e.putString("lang",lang);
    e.putLong("snap_at",System.currentTimeMillis());
    e.apply();
    GoldWidget.updateAll(getContext());
    if(sp().getBoolean("overlay",false)) OverlayService.refresh(getContext());
    c.resolve();
  }

  @PluginMethod public void overlayStatus(PluginCall c){
    JSObject o=new JSObject();
    o.put("canDraw", OverlayService.canDraw(getContext()));
    o.put("enabled", sp().getBoolean("overlay",false));
    c.resolve(o);
  }

  @PluginMethod public void requestOverlayPermission(PluginCall c){
    try{
      if(Build.VERSION.SDK_INT>=23){
        Intent i=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:"+getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
      }
      c.resolve();
    }catch(Exception e){ c.reject(e.getMessage()); }
  }

  @PluginMethod public void setOverlay(PluginCall c){
    boolean en=c.getBoolean("enabled",false);
    sp().edit().putBoolean("overlay",en).apply();
    if(en){
      if(!OverlayService.canDraw(getContext())){ c.reject("need_permission"); return; }
      OverlayService.start(getContext());
    } else {
      OverlayService.stop(getContext());
    }
    c.resolve();
  }

  /** Load partner URL in an offscreen WebView so Exness can plant the IB cookie in CookieManager. Does not forge cookies. */
  @PluginMethod public void warmPartner(PluginCall c){
    final String url=c.getString("url","");
    if(url==null||url.isEmpty()){ c.reject("url required"); return; }
    getActivity().runOnUiThread(() -> {
      try{
        CookieManager.getInstance().setAcceptCookie(true);
        final WebView w=new WebView(getContext());
        w.setLayoutParams(new ViewGroup.LayoutParams(1,1));
        w.setAlpha(0f);
        WebSettings s=w.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        final boolean[] done={false};
        Runnable finish=() -> { if(done[0]) return; done[0]=true; try{ ((ViewGroup)w.getParent()).removeView(w); }catch(Exception e){} try{ w.destroy(); }catch(Exception e){} c.resolve(); };
        w.setWebViewClient(new WebViewClient(){
          @Override public void onPageFinished(WebView view,String u){ new Handler(Looper.getMainLooper()).postDelayed(finish,800); }
          @Override public void onReceivedError(WebView view,int errorCode,String description,String failingUrl){ finish.run(); }
        });
        try{ ((ViewGroup)getActivity().getWindow().getDecorView()).addView(w); }catch(Exception e){ /* still load */ }
        w.loadUrl(url);
        new Handler(Looper.getMainLooper()).postDelayed(finish,12000);
      }catch(Exception e){ c.resolve(); }
    });
  }

  /* ---- On-device PureFxAi pack download ---- */

  @PluginMethod public void deviceModelStatus(PluginCall c){
    String name=sp().getString("deviceModelFile","purefxai-device.gguf");
    File out=new File(modelDir(), name);
    File part=new File(modelDir(), name+".part");
    long expect=sp().getLong("deviceModelSize",1270808032L);
    JSObject o=new JSObject();
    boolean ready=out.isFile() && out.length()>=Math.max(1, expect-1024);
    o.put("ready", ready);
    o.put("path", ready ? out.getAbsolutePath() : "");
    o.put("downloading", downloading.get());
    o.put("done", ready ? expect : (downloading.get() ? dlDone : part.length()));
    o.put("total", expect);
    o.put("fileName", name);
    c.resolve(o);
  }

  @PluginMethod public void cancelDeviceModel(PluginCall c){
    cancelDl.set(true);
    c.resolve();
  }

  @PluginMethod public void ensureDeviceModel(PluginCall c){
    final String url=c.getString("url","");
    final String sha=c.getString("sha256","");
    final String fileName=c.getString("fileName","purefxai-device.gguf");
    final long size=c.getLong("size",1270808032L);
    if(url==null||url.isEmpty()){ c.reject("url required"); return; }
    sp().edit().putString("deviceModelFile",fileName).putLong("deviceModelSize",size).apply();
    File out=new File(modelDir(), fileName);
    if(out.isFile() && out.length()>=Math.max(1, size-1024)){
      JSObject o=new JSObject(); o.put("ready",true); o.put("path",out.getAbsolutePath());
      notifyListeners("deviceModelReady", o);
      c.resolve(o); return;
    }
    if(!downloading.compareAndSet(false,true)){
      JSObject o=new JSObject(); o.put("started",false); o.put("downloading",true);
      c.resolve(o); return;
    }
    cancelDl.set(false);
    dlTotal=size; dlDone=0;
    c.resolve(new JSObject().put("started",true));
    io.execute(() -> {
      File part=new File(modelDir(), fileName+".part");
      try{
        if(modelDir().getUsableSpace() < size - part.length() + 200L*1048576L)
          throw new Exception("not_enough_space");
        long have=part.length(); dlDone=have;
        HttpURLConnection conn=null;
        URL u=new URL(url);
        for(int hop=0; hop<8; hop++){
          conn=(HttpURLConnection)u.openConnection();
          conn.setInstanceFollowRedirects(false);
          conn.setConnectTimeout(25000);
          conn.setReadTimeout(60000);
          conn.setRequestProperty("User-Agent","PUREGOLD-Android");
          if(have>0) conn.setRequestProperty("Range","bytes="+have+"-");
          int code=conn.getResponseCode();
          if(code==301||code==302||code==303||code==307||code==308){
            String loc=conn.getHeaderField("Location");
            conn.disconnect();
            if(loc==null||loc.isEmpty()) throw new Exception("redirect");
            u=new URL(loc);
            continue;
          }
          if(code==200 && have>0){ have=0; dlDone=0; //noinspection ResultOfMethodCallIgnored
            part.delete(); }
          else if(code!=200 && code!=206) throw new Exception("HTTP "+code);
          break;
        }
        if(conn==null) throw new Exception("no_connection");
        long lastEmit=0;
        try(InputStream in=conn.getInputStream(); FileOutputStream fo=new FileOutputStream(part, have>0)){
          byte[] buf=new byte[1<<16]; int r;
          while((r=in.read(buf))>0){
            if(cancelDl.get()) throw new Exception("cancelled");
            fo.write(buf,0,r); dlDone+=r;
            long now=System.currentTimeMillis();
            if(now-lastEmit>500){
              lastEmit=now;
              JSObject p=new JSObject();
              p.put("done",dlDone); p.put("total",dlTotal);
              notifyListeners("deviceModelProgress", p);
            }
          }
        } finally { try{ conn.disconnect(); }catch(Exception ignored){} }
        if(sha!=null && !sha.isEmpty()){
          notifyListeners("deviceModelProgress", new JSObject().put("done",dlDone).put("total",dlTotal).put("phase","verifying"));
          String got=sha256(part);
          if(!got.equalsIgnoreCase(sha)){ //noinspection ResultOfMethodCallIgnored
            part.delete(); throw new Exception("checksum"); }
        }
        if(out.exists()) //noinspection ResultOfMethodCallIgnored
          out.delete();
        if(!part.renameTo(out)) throw new Exception("rename");
        JSObject ready=new JSObject();
        ready.put("ready",true); ready.put("path",out.getAbsolutePath());
        notifyListeners("deviceModelReady", ready);
      }catch(Exception e){
        JSObject err=new JSObject();
        err.put("error", String.valueOf(e.getMessage()));
        notifyListeners("deviceModelError", err);
      }finally{
        downloading.set(false);
      }
    });
  }

  static String sha256(File f) throws Exception {
    MessageDigest md=MessageDigest.getInstance("SHA-256");
    try(InputStream in=new FileInputStream(f)){
      byte[] b=new byte[1<<16]; int r;
      while((r=in.read(b))>0) md.update(b,0,r);
    }
    StringBuilder sb=new StringBuilder();
    for(byte x: md.digest()) sb.append(String.format("%02x",x));
    return sb.toString();
  }
}
