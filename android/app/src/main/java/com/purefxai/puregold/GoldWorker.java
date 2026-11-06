package com.purefxai.puregold;
import android.app.*;import android.content.*;import android.speech.tts.*;import androidx.annotation.NonNull;import androidx.core.app.NotificationCompat;
import androidx.work.*;import org.json.*;import java.io.*;import java.net.*;import java.util.*;import java.util.concurrent.*;
/** Background refresh: Thai gold + XAU S/R + bias, rule-based. Alerts by notification + Thai TTS. Education only. */
public class GoldWorker extends Worker {
  static final String CH="pg_alerts", NAME="pg_auto";
  public GoldWorker(@NonNull Context c,@NonNull WorkerParameters p){super(c,p);}
  static SharedPreferences sp(Context c){return c.getSharedPreferences("pg",0);}
  static void schedule(Context c,boolean replace){ SharedPreferences p=sp(c); WorkManager wm=WorkManager.getInstance(c);
    if(!p.getBoolean("auto",true)){wm.cancelUniqueWork(NAME);return;}
    int iv=Math.max(1,p.getInt("interval",10));
    OneTimeWorkRequest r=new OneTimeWorkRequest.Builder(GoldWorker.class).setInitialDelay(iv,TimeUnit.MINUTES)
      .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build();
    wm.enqueueUniqueWork(NAME,replace?ExistingWorkPolicy.REPLACE:ExistingWorkPolicy.KEEP,r); }
  static void runOnce(Context c,boolean force){ WorkManager.getInstance(c).enqueue(new OneTimeWorkRequest.Builder(GoldWorker.class).setInputData(new Data.Builder().putBoolean("force",force).putBoolean("once",true).build()).build()); }
  static String get(String u)throws Exception{ HttpURLConnection h=(HttpURLConnection)new URL(u).openConnection();h.setConnectTimeout(10000);h.setReadTimeout(10000);
    try(BufferedReader b=new BufferedReader(new InputStreamReader(h.getInputStream(),"UTF-8"))){StringBuilder s=new StringBuilder();String l;while((l=b.readLine())!=null)s.append(l);return s.toString();} }
  static double[] ema(double[] a,int n){double k=2.0/(n+1);double[] o=new double[a.length];double e=a[0];for(int i=0;i<a.length;i++){e=a[i]*k+e*(1-k);o[i]=e;}return o;}
  @NonNull @Override public Result doWork(){ Context c=getApplicationContext(); SharedPreferences p=sp(c);
    boolean force=getInputData().getBoolean("force",false), once=getInputData().getBoolean("once",false);
    try{
      JSONArray k=null; for(String h:new String[]{"https://data-api.binance.vision","https://api.binance.com"}){try{k=new JSONArray(get(h+"/api/v3/klines?symbol=PAXGUSDT&interval=1h&limit=200"));break;}catch(Exception e){}}
      if(k==null) throw new Exception("binance");
      int n=k.length();double[] H=new double[n],L=new double[n],C=new double[n];
      for(int i=0;i<n;i++){JSONArray r=k.getJSONArray(i);H[i]=r.getDouble(2);L[i]=r.getDouble(3);C[i]=r.getDouble(4);}
      double px=C[n-1],spot=px; try{spot=new JSONObject(get("https://api.gold-api.com/price/XAU")).getDouble("price");}catch(Exception e){}
      double basis=spot-px, atr=0; for(int i=n-14;i<n;i++) atr+=Math.max(H[i]-L[i],Math.max(Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])));atr/=14;
      List<Double> pv=new ArrayList<>(); for(int i=3;i<n-3;i++){boolean hi=true,lo=true;for(int j=i-3;j<=i+3;j++){if(H[j]>H[i])hi=false;if(L[j]<L[i])lo=false;}if(hi)pv.add(H[i]+basis);if(lo)pv.add(L[i]+basis);}
      Collections.sort(pv); List<Double> lv=new ArrayList<>(); double s=0;int m=0;
      for(double x:pv){ if(m>0&&Math.abs(x-s/m)<=atr*.5){s+=x;m++;}else{if(m>0)lv.add(s/m);s=x;m=1;} } if(m>0)lv.add(s/m);
      double res=0,sup=0; for(double x:lv){ if(x>spot&&res==0)res=x; if(x<spot)sup=x; }
      double[] e20=ema(C,20),e50=ema(C,50); double g=0,l=0; for(int i=n-14;i<n;i++){double d=C[i]-C[i-1];if(d>0)g+=d;else l-=d;} double rsi=l==0?100:100-100/(1+g/l);
      double sc=Math.max(-1,Math.min(1,(e20[n-1]-e50[n-1])/atr))*.6+Math.max(-1,Math.min(1,(rsi-50)/20))*.4;
      String bias=sc>.2?"up":sc<-.2?"down":"side";
      String thai=""; try{JSONArray t=new JSONArray(get("https://apicheckprice.huasengheng.com/api/values/getprice/"));for(int i=0;i<t.length();i++){JSONObject o=t.getJSONObject(i);if("HSH".equals(o.optString("GoldType")))thai=o.optString("Sell");}}catch(Exception e){}
      boolean th="th".equals(p.getString("lang","th"));
      String lastBias=p.getString("bias",""); double lastPx=p.getFloat("px",0f), lastRes=p.getFloat("res",0f), lastSup=p.getFloat("sup",0f);
      boolean flip=!lastBias.isEmpty()&&!lastBias.equals(bias)&&p.getBoolean("alertBias",true);
      boolean brk=lastPx>0&&p.getBoolean("alertSR",true)&&((lastRes>0&&lastPx<lastRes&&spot>lastRes)||(lastSup>0&&lastPx>lastSup&&spot<lastSup));
      String bw=th?(bias.equals("up")?"ขึ้น":bias.equals("down")?"ลง":"ทรงตัว"):bias;
      String text=th?("ทองนอก"+bw+" ราคา"+ThaiNum.say((long)spot)+(res>0?" แนวต้าน"+ThaiNum.say(Math.round(res)):"")+(sup>0?" แนวรับ"+ThaiNum.say(Math.round(sup)):"")+(thai.isEmpty()?"":" ทองแท่งขายออก"+ThaiNum.say(Long.parseLong(thai.replace(",","").split("\\.")[0]))+"บาท"))
                    :("Gold "+bw+" at "+Math.round(spot)+(res>0?", resistance "+Math.round(res):"")+(sup>0?", support "+Math.round(sup):""));
      if(brk) text=(th?"ราคาเบรกแนวสำคัญ ":"Key level broken. ")+text; else if(flip) text=(th?"มุมมองเปลี่ยน ":"Bias changed. ")+text;
      JSONObject js=new JSONObject().put("price",spot).put("res",res).put("sup",sup).put("bias",bias).put("rsi",rsi).put("thaiSell",thai);
      p.edit().putString("bias",bias).putFloat("px",(float)spot).putFloat("res",(float)res).putFloat("sup",(float)sup).putString("lastText",text).putLong("lastAt",System.currentTimeMillis()).putString("lastJson",js.toString())
        .putFloat("snap_price",(float)spot).putString("snap_bias",bias).putString("snap_thaiSell",thai)
        .putLong("snap_at",System.currentTimeMillis()).apply();
      try{ GoldWidget.updateAll(c); OverlayService.refresh(c);}catch(Exception ignore){}
      // Custom price alerts from SharedPreferences JSON
      try{
        String paj=p.getString("priceAlerts","[]");
        org.json.JSONArray arr=new org.json.JSONArray(paj==null||paj.isEmpty()?"[]":paj);
        double lastPxAlert=p.getFloat("pxAlertLast",0f);
        org.json.JSONArray keep=new org.json.JSONArray();
        boolean anyHit=false;
        for(int i=0;i<arr.length();i++){
          org.json.JSONObject a=arr.getJSONObject(i);
          if(!a.optBoolean("active",true)){ keep.put(a); continue; }
          double ap=a.getDouble("price");
          String dir=a.optString("dir","cross");
          boolean hit=false;
          if("above".equals(dir)) hit=spot>=ap && (lastPxAlert<ap || lastPxAlert==0);
          else if("below".equals(dir)) hit=spot<=ap && (lastPxAlert>ap || lastPxAlert==0);
          else hit=lastPxAlert>0 && ((lastPxAlert<ap && spot>=ap)||(lastPxAlert>ap && spot<=ap));
          if(hit){
            anyHit=true;
            String ct=th?("ราคาทองถึง"+ThaiNum.say(Math.round(ap))+" ตอนนี้"+ThaiNum.say(Math.round(spot)))
                        :("Gold hit "+Math.round(ap)+", now "+Math.round(spot));
            alert(c,ct,p);
            a.put("active",false); a.put("hitAt",System.currentTimeMillis());
            // also flip main text if not already alerting
            if(!flip&&!brk&&!force) text=ct;
          }
          keep.put(a);
        }
        p.edit().putString("priceAlerts",keep.toString()).putFloat("pxAlertLast",(float)spot).apply();
        if(anyHit && !(flip||brk||force)) { /* already alerted above */ }
      }catch(Exception ignore){}
      if(flip||brk||force) alert(c,text,p, force && once);
    }catch(Exception e){}
    if(!once) schedule(c,true);
    return Result.success(); }
  static final String CH_POP="pg_popup_sms";
  static void ensureChannels(NotificationManager nm){
    if(android.os.Build.VERSION.SDK_INT>=26){
      NotificationChannel def=new NotificationChannel(CH,"PUREGOLD alerts",NotificationManager.IMPORTANCE_DEFAULT);
      def.setDescription("Price and bias alerts");
      nm.createNotificationChannel(def);
      // SMS-style heads-up: HIGH importance + vibration (like messaging popups)
      NotificationChannel pop=new NotificationChannel(CH_POP,"PUREGOLD pop-up",NotificationManager.IMPORTANCE_HIGH);
      pop.setDescription("SMS-style heads-up for price, signal, and chat alerts");
      pop.enableVibration(true);
      pop.setVibrationPattern(new long[]{0,180,80,180});
      pop.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
      pop.setShowBadge(true);
      nm.createNotificationChannel(pop);
    }
  }
  static boolean allowAlert(SharedPreferences p,String text){
    int iv=Math.max(1,p.getInt("interval",10));
    long now=System.currentTimeMillis();
    long last=p.getLong("lastAlertAt",0);
    if(now-last < iv*60_000L) return false;
    String prev=p.getString("lastAlertText","");
    if(text!=null && text.equals(prev) && now-last < iv*60_000L) return false;
    return true;
  }
  static void noteAlert(SharedPreferences p,String text){
    p.edit().putLong("lastAlertAt",System.currentTimeMillis()).putString("lastAlertText",text==null?"":text).apply();
  }
  /** SMS-like heads-up popup (HIGH channel). */
  static void popup(Context c,String title,String text,String kind){ popup(c,title,text,kind,false); }
  static void popup(Context c,String title,String text,String kind,boolean bypass){
    SharedPreferences p=sp(c);
    if(!bypass && !allowAlert(p,text)) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    ensureChannels(nm);
    PendingIntent pi=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
    int id=2100 + Math.abs((kind==null?"a":kind).hashCode()%80);
    try{
      NotificationCompat.Builder b=new NotificationCompat.Builder(c,CH_POP)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(title==null||title.isEmpty()?"PUREGOLD":title)
        .setContentText(text)
        .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(pi)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_MESSAGE)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setDefaults(NotificationCompat.DEFAULT_ALL)
        .setVibrate(new long[]{0,180,80,180});
      nm.notify(id,b.build());
      noteAlert(p,text);
    }catch(SecurityException e){}
  }
  static void alert(Context c,String text,SharedPreferences p){ alert(c,text,p,false); }
  static void alert(Context c,String text,SharedPreferences p,boolean bypass){
    if(!bypass && !allowAlert(p,text)) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    ensureChannels(nm);
    // Prefer SMS-style heads-up for actionable price/bias alerts
    popup(c,"PUREGOLD",text,"alert",true);
    boolean dnd=nm.getCurrentInterruptionFilter()>NotificationManager.INTERRUPTION_FILTER_ALL;
    if(p.getBoolean("voice",true)&&!p.getBoolean("mute",false)&&!dnd) speak(c,text,"th".equals(p.getString("lang","th")));
  }
  static void speak(Context c,String text,boolean th){ speakLang(c,text, th?"th":"en"); }
  static void speakLang(Context c,String text,String lang){
    CountDownLatch ok=new CountDownLatch(1),done=new CountDownLatch(1); final TextToSpeech[] t=new TextToSpeech[1];
    t[0]=new TextToSpeech(c,st->ok.countDown());
    try{
      ok.await(10,TimeUnit.SECONDS);
      Locale loc;
      if("th".equals(lang)) loc=new Locale("th","TH");
      else if("zh".equals(lang)) loc=Locale.SIMPLIFIED_CHINESE;
      else if("ja".equals(lang)) loc=Locale.JAPAN;
      else loc=Locale.US;
      int r=t[0].setLanguage(loc);
      if(r==TextToSpeech.LANG_MISSING_DATA||r==TextToSpeech.LANG_NOT_SUPPORTED) t[0].setLanguage(Locale.US);
      t[0].setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String u){} public void onDone(String u){done.countDown();} public void onError(String u){done.countDown();}});
      // Cap chat replies so TTS does not run forever
      String say=text.length()>600?text.substring(0,600):text;
      t[0].speak(say,TextToSpeech.QUEUE_FLUSH,null,"pg");
      done.await(45,TimeUnit.SECONDS);
    }catch(Exception e){} finally{try{t[0].shutdown();}catch(Exception ignored){}}
  }
}
