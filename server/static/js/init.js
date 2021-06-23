var show = document.getElementsByClassName("show1")[0];
for(var i=0; i<4; i++) {
	$.ajax({
		url: 'http://127.0.0.1:5000/comment',
		method: 'GET',
		async: false,
		success: function(res) {
			// show.innerHTML = show.innerHTML + res;
			res = JSON.parse(res);
			// console.log((i+1) );
			if((res['code']+1) % 2 === 1) {
				show.innerHTML = show.innerHTML + '<li><p style="float: left;"><b>'+res['song']+'</b><br>' +
                  		res['content'] + '<br> </p> <p class="fr pt17">' + res['nickname'] +'</p> </li>';
			} else {
				show.innerHTML = show.innerHTML + '<li class="bg"><p style="float: left;"><b>'+res['song']+'</b><br>' +
                  		res['content'] + '<br> </p> <p class="fr pt17">' + res['nickname'] +'</p> </li>';
			}
		}
	})
}