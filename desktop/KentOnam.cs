using System;
using System.IO;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;
internal static class Program {
 internal static string Smoke;
 [STAThread] static void Main(string[] parameters){Smoke=parameters.Length==2&&parameters[0]=="--smoke"?Path.GetFullPath(parameters[1]):null;Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new KentWindow());}
}
internal sealed class KentWindow:Form {
 WebView2 browser=new WebView2();
 public KentWindow(){Text="Kent Onam | Erişilebilir Onam Yönetim Merkezi";Size=new Size(1320,920);MinimumSize=new Size(900,640);StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(245,246,249);browser.Dock=DockStyle.Fill;Controls.Add(browser);Shown+=Initialize;
  if(Program.Smoke!=null){ShowInTaskbar=false;StartPosition=FormStartPosition.Manual;Location=new Point(-30000,-30000);Directory.CreateDirectory(Program.Smoke);}
 }
 async void Initialize(object sender,EventArgs arguments){try{
  string profile=Path.Combine(Program.Smoke??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"KentOnam"),"browser-profile");
  var environment=await CoreWebView2Environment.CreateAsync(null,profile);await browser.EnsureCoreWebView2Async(environment);
  browser.CoreWebView2.Settings.IsPasswordAutosaveEnabled=false;browser.CoreWebView2.Settings.IsGeneralAutofillEnabled=false;browser.CoreWebView2.Settings.AreHostObjectsAllowed=false;browser.CoreWebView2.Settings.IsWebMessageEnabled=true;
  browser.CoreWebView2.WebMessageReceived+=(s,e)=>{Uri source;if(!Uri.TryCreate(e.Source,UriKind.Absolute,out source)||source.Scheme!="https"||source.Host!="kent-onam.local")return;try{string message=e.TryGetWebMessageAsString();if(message=="onam-lock"||message=="onam-logout"){foreach(Form child in OwnedForms)child.Close();}}catch(Exception){}};
  browser.CoreWebView2.SetVirtualHostNameToFolderMapping("kent-onam.local",Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"ui"),CoreWebView2HostResourceAccessKind.DenyCors);
  await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.ONAM_DESKTOP=true;");
  browser.CoreWebView2.PermissionRequested+=(s,e)=>{e.State=CoreWebView2PermissionState.Deny;};
  browser.CoreWebView2.NewWindowRequested+=(s,e)=>{e.Handled=true;Uri target;if(Uri.TryCreate(e.Uri,UriKind.Absolute,out target)&&target.Scheme=="https"&&(target.Host=="llmichaell2.github.io"||target.Host=="www.kent.edu.tr"||target.Host=="kent.edu.tr")){var child=new Form();child.Text="Kent Onam · Belge";child.Size=new Size(1000,800);var view=new WebView2();view.Dock=DockStyle.Fill;view.Source=target;child.Controls.Add(view);child.Show(this);}};
  browser.CoreWebView2.NavigationStarting+=(s,e)=>{Uri target;if(!Uri.TryCreate(e.Uri,UriKind.Absolute,out target)||target.Scheme!="https"||target.Host!="kent-onam.local")e.Cancel=true;else if(target.AbsolutePath=="/yonetim/"||target.AbsolutePath=="/"){e.Cancel=true;browser.CoreWebView2.Navigate("https://kent-onam.local/yonetim/index.html"+target.Fragment);}};
  browser.CoreWebView2.NavigationCompleted+=async(s,e)=>{if(Program.Smoke==null)return;try{if(!e.IsSuccess)throw new Exception(e.WebErrorStatus.ToString());await Task.Delay(500);string ready=await browser.ExecuteScriptAsync("!!document.getElementById('login-button') && document.getElementById('desktop-label').textContent==='Windows uygulaması'");if(ready!="true")throw new Exception("Yönetim ekranı hazır değil: "+ready);string home=await browser.ExecuteScriptAsync("document.getElementById('portal-home-link').click(); location.pathname==='/yonetim/index.html' && !!document.querySelector('.portal-carousel')");if(home!="true")throw new Exception("Ana sayfa bağlantısı açılamadı");var testChild=new Form();testChild.Owner=this;await browser.ExecuteScriptAsync("window.chrome.webview.postMessage('onam-lock')");await Task.Delay(150);if(OwnedForms.Length!=0)throw new Exception("Belge pencereleri kilitte kapanmadı");using(var stream=File.Create(Path.Combine(Program.Smoke,"desktop-login.png")))await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,stream);File.WriteAllText(Path.Combine(Program.Smoke,"smoke-ok.txt"),"Windows EXE loaded; home link and document-window lock verified.");}catch(Exception error){File.WriteAllText(Path.Combine(Program.Smoke,"smoke-error.txt"),error.ToString());Environment.ExitCode=1;}Close();};
  browser.CoreWebView2.Navigate("https://kent-onam.local/yonetim/index.html");
 }catch(Exception error){if(Program.Smoke!=null)File.WriteAllText(Path.Combine(Program.Smoke,"smoke-error.txt"),error.ToString());else MessageBox.Show("WebView2 başlatılamadı. Microsoft Edge WebView2 Runtime kurulumunu kontrol edin.\n\n"+error.Message,"Kent Onam");Environment.ExitCode=1;Close();}}
}
