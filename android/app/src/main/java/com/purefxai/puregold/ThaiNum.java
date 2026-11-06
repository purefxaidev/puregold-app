package com.purefxai.puregold;
/** Integer to spoken Thai words (template TTS). */
public class ThaiNum {
  static final String[] D={"ศูนย์","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"}, P={"","สิบ","ร้อย","พัน","หมื่น","แสน"};
  static String six(long n){ String s=String.valueOf(n),o=""; int L=s.length();
    for(int i=0;i<L;i++){int d=s.charAt(i)-'0',pos=L-1-i; if(d==0)continue;
      if(pos==1&&d==1)o+="สิบ"; else if(pos==1&&d==2)o+="ยี่สิบ"; else if(pos==0&&d==1&&L>1)o+="เอ็ด"; else o+=D[d]+P[pos];} return o; }
  public static String say(long n){ if(n==0)return D[0]; if(n<0)return "ลบ"+say(-n); if(n>=1000000)return say(n/1000000)+"ล้าน"+(n%1000000==0?"":six(n%1000000)); return six(n); }
}
