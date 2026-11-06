package com.purefxai.puregold;
import android.os.Build;import android.os.Bundle;import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle b){ registerPlugin(PgPlugin.class); super.onCreate(b);
    if(Build.VERSION.SDK_INT>=33) requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);
    GoldWorker.schedule(this,false); }
}
