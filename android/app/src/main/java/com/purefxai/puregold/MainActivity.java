package com.purefxai.puregold;
import android.content.SharedPreferences;
import android.os.Build;import android.os.Bundle;import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle b){ registerPlugin(PgPlugin.class); super.onCreate(b);
    if(Build.VERSION.SDK_INT>=33) requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);
    GoldWorker.schedule(this,false);
    SharedPreferences p=getSharedPreferences("pg",0);
    if(p.getBoolean("overlay",false) && OverlayService.canDraw(this)) OverlayService.start(this);
    GoldWidget.updateAll(this);
  }
  @Override public void onResume(){
    super.onResume();
    SharedPreferences p=getSharedPreferences("pg",0);
    if(p.getBoolean("overlay",false) && OverlayService.canDraw(this) && !OverlayService.isRunning()) OverlayService.start(this);
    GoldWidget.updateAll(this);
  }
}
