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

@CapacitorPlugin(name="PgNative")
public class PgPlugin extends Plugin {
  SharedPreferences sp(){return getContext().getSharedPreferences("pg",0);}

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
}
