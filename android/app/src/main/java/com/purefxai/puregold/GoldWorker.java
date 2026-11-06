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
    OneTimeWorkRequest r=new OneTimeWorkRequest.Builder(GoldWorker.class).setInitialDelay(Math.max(5,p.getInt("interval",10)),TimeUnit.MINUTES)
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
      boolean th=!"en".equals(p.getString("lang","th"));
      String lastBias=p.getString("bias",""); double lastPx=p.getFloat("px",0f), lastRes=p.getFloat("res",0f), lastSup=p.getFloat("sup",0f);
      boolean flip=!lastBias.isEmpty()&&!lastBias.equals(bias)&&p.getBoolean("alertBias",true);
      boolean brk=lastPx>0&&p.getBoolean("alertSR",true)&&((lastRes>0&&lastPx<lastRes&&spot>lastRes)||(lastSup>0&&lastPx>lastSup&&spot<lastSup));
      String bw=th?(bias.equals("up")?"ขึ้น":bias.equals("down")?"ลง":"ทรงตัว"):bias;
      String text=th?("ทองนอก"+bw+" ราคา"+ThaiNum.say((long)spot)+(res>0?" แนวต้าน"+ThaiNum.say(Math.round(res)):"")+(sup>0?" แนวรับ"+ThaiNum.say(Math.round(sup)):"")+(thai.isEmpty()?"":" ทองแท่งขายออก"+ThaiNum.say(Long.parseLong(thai.replace(",","").split("\\.")[0]))+"บาท"))
                    :("Gold "+bw+" at "+Math.round(spot)+(res>0?", resistance "+Math.round(res):"")+(sup>0?", support "+Math.round(sup):""));
      if(brk) text=(th?"ราคาเบรกแนวสำคัญ ":"Key level broken. ")+text; else if(flip) text=(th?"มุมมองเปลี่ยน ":"Bias changed. ")+text;
      JSONObject js=new JSONObject().put("price",spot).put("res",res).put("sup",sup).put("bias",bias).put("rsi",rsi).put("thaiSell",thai);
      p.edit().putString("bias",bias).putFloat("px",(float)spot).putFloat("res",(float)res).putFloat("sup",(float)sup).putString("lastText",text).putLong("lastAt",System.currentTimeMillis()).putString("lastJson",js.toString()).apply();
      if(flip||brk||force) alert(c,text,p);
    }catch(Exception e){}
    if(!once) schedule(c,true);
    return Result.success(); }
  static void alert(Context c,String text,SharedPreferences p){
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    if(android.os.Build.VERSION.SDK_INT>=26) nm.createNotificationChannel(new NotificationChannel(CH,"PUREGOLD alerts",NotificationManager.IMPORTANCE_DEFAULT));
    PendingIntent pi=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
    try{nm.notify(1001,new NotificationCompat.Builder(c,CH).setSmallIcon(R.mipmap.ic_launcher).setContentTitle("PUREGOLD").setContentText(text)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setContentIntent(pi).setAutoCancel(true).build());}catch(SecurityException e){}
    boolean dnd=nm.getCurrentInterruptionFilter()>NotificationManager.INTERRUPTION_FILTER_ALL;
    if(p.getBoolean("voice",true)&&!p.getBoolean("mute",false)&&!dnd) speak(c,text,!"en".equals(p.getString("lang","th")));
  }
  static void speak(Context c,String text,boolean th){ CountDownLatch ok=new CountDownLatch(1),done=new CountDownLatch(1); final TextToSpeech[] t=new TextToSpeech[1];
    t[0]=new TextToSpeech(c,st->ok.countDown());
    try{ ok.await(10,TimeUnit.SECONDS); t[0].setLanguage(th?new Locale("th","TH"):Locale.US);
      t[0].setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String u){} public void onDone(String u){done.countDown();} public void onError(String u){done.countDown();}});
      t[0].speak(text,TextToSpeech.QUEUE_FLUSH,null,"pg"); done.await(30,TimeUnit.SECONDS);}catch(Exception e){} finally{t[0].shutdown();} }
}
