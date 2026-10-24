/* Data ruangan. Koordinat dalam piksel pada gambar acuan (refWidth x refHeight).
   floor   : poligon area lantai yang boleh diganti (tepi furnitur/karpet sudah dikecualikan).
   camera  : perkiraan perspektif foto.
             vx = titik hilang garis lantai (x), horizon = tinggi garis cakrawala (y),
             cy = pusat gambar vertikal, f = panjang fokus (piksel), height = tinggi kamera (cm).
             Ubah height untuk memperbesar/memperkecil ubin; ubah f untuk membuat ubin lebih pipih/tinggi.
   closeRadius : radius penghapus garis nat lama pada foto (0 = mati). smooth : radius penghalusan tambahan. */
window.ROOMS=[{
 id:'ruang-tamu', name:'Ruang tamu', image:'ruang-tamu', refWidth:1672, refHeight:941,
 camera:{vx:790,cy:470,horizon:290,f:700,height:70},
 closeRadius:2,
 smooth:1,
 floor:[[0,431],[55,431],[66,421],[91,421],[91,452],[64,460],[66,462.5],[92,462.5],[250,462.5],[430,462.5],[610,463],[790,463.5],[970,464],[962,452],[938,432],[926,421],[915,411],[898,399],[889,383],[884,374],[884,358],[898,352],[950,352],[1000,349],[1060,349],[1100,357],[1148,361],[1190,356],[1194,371],[1245,385],[1260,390],[1320,403],[1380,417],[1440,430],[1500,444],[1560,458],[1620,472],[1672,484],[1672,941],[0,941]]
}];
