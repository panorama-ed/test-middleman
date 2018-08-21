module StylistHelper
  # rubocop:disable Rails/OutputSafety
  def display_example(code)
    "<pre>#{escape_html(code.sub(" data-toc-skip", "")).strip}</pre>".html_safe +
      "<div class=\"well\">#{code}</div>".html_safe
  end
end
