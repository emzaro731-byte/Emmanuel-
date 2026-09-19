document.getElementById("year").textContent=new Date().getFullYear();

document.querySelector(".menu").addEventListener("click",()=>{
  const n=document.querySelector("nav");
  n.style.display=n.style.display==="flex"?"none":"flex";
  n.style.position="absolute";
  n.style.right="7%";
  n.style.top="65px";
  n.style.flexDirection="column";
  n.style.padding="18px";
  n.style.background="#101522";
  n.style.border="1px solid #20283a";
  n.style.borderRadius="14px";
});

function sendMessage(e){
  e.preventDefault();
  const f=e.currentTarget;
  const name=f.name.value.trim();
  const email=f.email.value.trim();
  const message=f.message.value.trim();

  if(!name || !email || !message){
    alert("Please complete all fields.");
    return;
  }

  const text=encodeURIComponent(
    "Hello Emmanuel, I have a message from your portfolio website.\n\n"+
    "Name: "+name+"\n"+
    "Email: "+email+"\n\n"+
    "Message:\n"+message
  );

  window.open("https://wa.me/2348088476779?text="+text,"_blank");
}