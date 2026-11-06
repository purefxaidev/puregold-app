package com.purefxai.puregold;
import android.content.SharedPreferences;import com.getcapacitor.*;import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="PgNative")
public class PgPlugin extends Plugin {
  SharedPreferences sp(){return getContext().getSharedPreferences("pg",0);}
  @PluginMethod public void setSettings(PluginCall c){ SharedPreferences.Editor e=sp().edit();
    e.putBoolean("auto",c.getBoolean("auto",true)); e.putInt("interval",c.getInt("interval",10)); e.putBoolean("voice",c.getBoolean("voice",true));
    e.putBoolean("mute",c.getBoolean("mute",false)); e.putBoolean("alertSR",c.getBoolean("alertSR",true)); e.putBoolean("alertBias",c.getBoolean("alertBias",true));
    e.putString("lang",c.getString("lang","th")); e.apply(); GoldWorker.schedule(getContext(),true); c.resolve(); }
  @PluginMethod public void getLast(PluginCall c){ JSObject o=new JSObject(); o.put("text",sp().getString("lastText",""));o.put("at",sp().getLong("lastAt",0));o.put("json",sp().getString("lastJson",""));c.resolve(o); }
  @PluginMethod public void runNow(PluginCall c){ GoldWorker.runOnce(getContext(),c.getBoolean("force",true)); c.resolve(); }
}
