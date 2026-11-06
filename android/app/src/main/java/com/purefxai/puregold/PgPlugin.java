package com.purefxai.puregold;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
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
  @PluginMethod public void setSettings(PluginCall c){ SharedPreferences.Editor e=sp().edit();
    e.putBoolean("auto",c.getBoolean("auto",true)); e.putInt("interval",c.getInt("interval",10)); e.putBoolean("voice",c.getBoolean("voice",true));
    e.putBoolean("mute",c.getBoolean("mute",false)); e.putBoolean("alertSR",c.getBoolean("alertSR",true)); e.putBoolean("alertBias",c.getBoolean("alertBias",true));
    e.putString("lang",c.getString("lang","th")); e.apply(); GoldWorker.schedule(getContext(),true); c.resolve(); }
  @PluginMethod public void getLast(PluginCall c){ JSObject o=new JSObject(); o.put("text",sp().getString("lastText",""));o.put("at",sp().getLong("lastAt",0));o.put("json",sp().getString("lastJson",""));c.resolve(o); }
  @PluginMethod public void runNow(PluginCall c){ GoldWorker.runOnce(getContext(),c.getBoolean("force",true)); c.resolve(); }

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
