@posts = Post.all(:select => "title, author, id, content, posted_at", :order => "posted_at DESC", :limit => 20) 

respond_to do |format|
   format.rss { render :layout => false }
end
