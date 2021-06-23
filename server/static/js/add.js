var show = document.getElementsByClassName("show1")[0];
var timeId;
timeId = setInterval(add, 2000);
// console.log();
function add(){
	// for(var i=0; i<1; i++) {
	try{
		i = 0
		$.ajax({
			url: 'http://127.0.0.1:5000/comment',
			method: 'GET',
			success: function(res) {
				// show.innerHTML = show.innerHTML + res;
				res = JSON.parse(res);
				// console.log((i+1) );
				if((res['code']+1) % 2 === 1) {
					show.innerHTML = show.innerHTML + '<li><p style="float: left;"><b>'+res['song']+'</b><br>' +
						res['content'] + '<br> </p> <p class="fr pt17">' + res['nickname'] +'</p> </li>';
					i = 1;
				} else {
					show.innerHTML = show.innerHTML + '<li class="bg"><p style="float: left;"><b>'+res['song']+'</b><br>' +
						res['content'] + '<br> </p> <p class="fr pt17">' + res['nickname'] +'</p> </li>';
					i = 0;
				}
				// show.childNodes[0].remove();
			},
			error: function(res){}
		})
	} catch(err){}
}
add();
main.onmouseover = function(){
	clearInterval(timeId)
};
main.onmouseout = function(){
	timeId = setInterval(add, 2000);
};