BEGIN {
    title = TITLE
    print "{% extends 'base.html' %}"
    print "{% block title %}" title "{% endblock %}"
    skip = 1
}
/<style>/ {
    print "{% block extra_head %}"
    print
    in_style = 1
    skip = 0
    next
}
/<\/style>/ {
    print
    print "{% endblock %}"
    in_style = 0
    next
}
{ if(in_style) {print; next} }
/<head>/ {next}
/<\/head>/ {next}
/^<!DOCTYPE html>/ {next}
/^<html/ {next}
/<body>/ {print "{% block content %}"; next}
/{% include 'navbar.html' %}/ {next}
/bootstrap\.bundle\.min\.js/ {print "{% endblock %}\n{% block extra_scripts %}"; scripts=1; next}
/chart\.js/ {next}
/\/app\.js/ {next}
/<\/script>/ && scripts {print; print "{% endblock %}"; scripts=0; next}
/<\/body>/ {next}
/<\/html>/ {next}
{ if(!skip && !in_style) print }
